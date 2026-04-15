from __future__ import annotations

from dataclasses import asdict, replace
from typing import Any, Dict

import numpy as np
from scipy import signal
from scipy.stats import chi2

from adcs_core.aircraft.aerodynamics import ControlInputs
from adcs_core.aircraft.database import AircraftModel, build_aircraft_model_from_payload, get_aircraft_model
from adcs_core.aircraft.forces_moments import ActuatorLimits
from adcs_core.aircraft.parameters import AircraftParameters
from adcs_core.analysis.jacobian_validation import validate_jacobian
from adcs_core.analysis.lqr_longitudinal import (
    LONGITUDINAL_INPUT_IDX_FULL,
    LONGITUDINAL_STATE_IDX_FULL,
    design_longitudinal_lqr,
)
from adcs_core.analysis.modal_analysis import analyze_modal_structure
from adcs_core.analysis.trim import compute_level_trim
from adcs_core.control.linearize import linearize
from adcs_core.environment.atmosphere import ISAParams, isa_atmosphere
from adcs_core.estimation.ekf import AttitudeEKF
from adcs_core.model import xdot_full
from adcs_core.state.state_definition import StateIndex


def serialize_model(model: AircraftModel) -> dict[str, Any]:
    return {
        "selected_aircraft": {
            "id": model.id,
            "name": model.name,
            "classification": model.classification,
            "stability_mode": model.stability_mode,
        },
        "geometry": {
            "wingArea": model.geometry.wing_area,
            "wingspan": model.geometry.wingspan,
            "meanAerodynamicChord": model.geometry.mean_aerodynamic_chord,
            "tailArm": model.geometry.tail_arm,
            "cgLocation": model.geometry.cg_location,
        },
        "inertia": {
            "mass": model.inertia.mass,
            "Ixx": model.inertia.Ixx,
            "Iyy": model.inertia.Iyy,
            "Izz": model.inertia.Izz,
            "Ixz": model.inertia.Ixz,
        },
        "aero": {
            "Xu": model.aero_derivatives.Xu,
            "Xw": model.aero_derivatives.Xw,
            "Zu": model.aero_derivatives.Zu,
            "Zw": model.aero_derivatives.Zw,
            "Mu": model.aero_derivatives.Mu,
            "Mw": model.aero_derivatives.Mw,
            "Mq": model.aero_derivatives.Mq,
            "Yv": model.aero_derivatives.Yv,
            "Lv": model.aero_derivatives.Lv,
            "Lp": model.aero_derivatives.Lp,
            "Nr": model.aero_derivatives.Nr,
        },
        "metadata": model.metadata,
    }


def _serialize_eigs(eigs: np.ndarray) -> list[dict[str, float]]:
    return [{"real": float(ev.real), "imag": float(ev.imag)} for ev in np.asarray(eigs).reshape(-1)]


def _min_damping(eigs: np.ndarray) -> float | None:
    zetas: list[float] = []
    for ev in np.asarray(eigs).reshape(-1):
        sigma = float(np.real(ev))
        omega = float(np.imag(ev))
        if abs(omega) < 1e-10:
            continue
        wn = float(np.hypot(sigma, omega))
        if wn > 1e-12:
            zetas.append(float(-sigma / wn))
    return min(zetas) if zetas else None


def _compute_settling_time(t_hist: np.ndarray, signal: np.ndarray, target: float, *, band_fraction: float = 0.02) -> float | None:
    if t_hist.size == 0 or signal.size == 0:
        return None
    deviation = np.abs(signal - target)
    peak_deviation = float(np.max(deviation))
    if peak_deviation <= 1e-12:
        return 0.0
    threshold = max(1e-9, band_fraction * peak_deviation)
    outside = np.where(deviation > threshold)[0]
    if outside.size == 0:
        return 0.0
    last_outside = int(outside[-1])
    if last_outside >= len(t_hist) - 1:
        return None
    return float(t_hist[last_outside + 1])


def _extract_flight_condition(payload: Dict[str, Any]) -> dict[str, float]:
    return {
        "V_mps": float(payload.get("V_mps", payload.get("velocity", 60.0))),
        "altitude_m": float(payload.get("altitude_m", payload.get("altitude", 1000.0))),
        "isa_temp_offset_c": float(payload.get("isa_temp_offset_c", 0.0)),
        "headwind_mps": float(payload.get("headwind_mps", 0.0)),
        "crosswind_mps": float(payload.get("crosswind_mps", 0.0)),
    }


def resolve_model_from_payload(payload: Dict[str, Any], current_model: AircraftModel | None = None) -> tuple[AircraftModel, dict[str, float]]:
    fc = _extract_flight_condition(payload)
    if "custom_aircraft" in payload:
        model = build_aircraft_model_from_payload(payload["custom_aircraft"])
    elif payload.get("aircraft_id"):
        model = get_aircraft_model(str(payload["aircraft_id"]))
    elif current_model is not None:
        model = current_model
    else:
        model = get_aircraft_model("cessna_172r")
        
    adjusted = apply_flight_condition(model.params, fc)
    return replace(model, params=adjusted), fc


def apply_flight_condition(params: AircraftParameters, fc: dict[str, float]) -> AircraftParameters:
    isa = ISAParams(T0=288.15 + fc["isa_temp_offset_c"])
    _, _, rho, _ = isa_atmosphere(fc["altitude_m"], params=isa)
    return replace(params, rho_kgm3=float(rho))


def linearize_full(x0: np.ndarray, u0: np.ndarray, params: AircraftParameters, limits: ActuatorLimits) -> tuple[np.ndarray, np.ndarray]:
    def f(x: np.ndarray, u_vec: np.ndarray) -> np.ndarray:
        ctrl = ControlInputs(
            throttle=float(u_vec[0]),
            aileron=float(u_vec[1]),
            elevator=float(u_vec[2]),
            rudder=float(u_vec[3]),
        )
        return xdot_full(x, ctrl, params=params, limits=limits)

    return linearize(f, x0, u0)


def compute_metrics_from_modal(modal: dict[str, Any]) -> dict[str, float | None]:
    modes = modal.get("modes", [])
    phugoid = next((m for m in modes if m["type"] == "phugoid"), None)
    short_period = next((m for m in modes if m["type"] == "short_period"), None)
    roll = next((m for m in modes if m["type"] == "roll"), None)
    spiral = next((m for m in modes if m["type"] == "spiral"), None)

    def real_time_constant(mode: dict[str, Any] | None) -> float | None:
        if not mode:
            return None
        sigma = float(mode["eigenvalue_real"])
        if abs(sigma) < 1e-9:
            return None
        return float(abs(1.0 / sigma))

    def period(mode: dict[str, Any] | None) -> float | None:
        if not mode:
            return None
        imag = abs(float(mode["eigenvalue_imag"]))
        if imag < 1e-9:
            return None
        return float(2.0 * np.pi / imag)

    return {
        "spectral_margin": float(modal.get("spectral_margin", 0.0)),
        "short_period_damping": None if short_period is None else short_period.get("zeta"),
        "phugoid_period_s": period(phugoid),
        "phugoid_natural_frequency": None if phugoid is None else phugoid.get("wn"),
        "roll_time_constant_s": real_time_constant(roll),
        "spiral_time_constant_s": real_time_constant(spiral),
    }


def build_analysis_bundle(payload: Dict[str, Any], current_model: AircraftModel | None = None) -> dict[str, Any]:
    model, fc = resolve_model_from_payload(payload, current_model=current_model)
    trim = compute_level_trim(fc["V_mps"], model.params, limits=model.limits, aircraft_category=model.stability_mode)
    A, B = linearize_full(trim.x0, trim.u0, model.params, model.limits)
    eigvals = np.linalg.eigvals(A)
    modal = analyze_modal_structure(A).as_dict()

    return {
        "model": model,
        "flight_condition": fc,
        "trim": trim,
        "A": A,
        "B": B,
        "eigenvalues": eigvals,
        "modal_analysis": modal,
        "metrics": compute_metrics_from_modal(modal),
    }


def trim_response(bundle: dict[str, Any]) -> dict[str, Any]:
    trim = bundle["trim"]
    fc = bundle["flight_condition"]
    return {
        "aircraft_id": bundle["model"].id,
        "V_mps": fc["V_mps"],
        "flight_condition": fc,
        "x0": trim.x0.tolist(),
        "u0": trim.u0.tolist(),
        "alpha_rad": trim.alpha,
        "theta_rad": trim.theta,
        "throttle": trim.throttle,
        "elevator_rad": trim.elevator,
        "residual_norm": trim.residual_norm,
        "solver_success": trim.success,
        "solver_nfev": trim.nfev,
    }


def linearization_response(bundle: dict[str, Any]) -> dict[str, Any]:
    trim = bundle["trim"]
    return {
        "aircraft_id": bundle["model"].id,
        "V_mps": bundle["flight_condition"]["V_mps"],
        "flight_condition": bundle["flight_condition"],
        "trim": {
            "x0": trim.x0.tolist(),
            "u0": trim.u0.tolist(),
            "alpha_rad": trim.alpha,
            "theta_rad": trim.theta,
            "throttle": trim.throttle,
            "elevator_rad": trim.elevator,
            "residual_norm": trim.residual_norm,
            "solver_success": trim.success,
            "solver_nfev": trim.nfev,
        },
        "A": bundle["A"].tolist(),
        "B": bundle["B"].tolist(),
        "eigenvalues": _serialize_eigs(bundle["eigenvalues"]),
        "modal_analysis": bundle["modal_analysis"],
        "metrics": bundle["metrics"],
    }


def custom_aircraft_response(payload: Dict[str, Any]) -> dict[str, Any]:
    bundle = build_analysis_bundle(payload)
    return {
        **serialize_model(bundle["model"]),
        **linearization_response(bundle),
        "computed_metrics": bundle["metrics"],
    }


def control_response(payload: Dict[str, Any], current_model: AircraftModel | None = None) -> dict[str, Any]:
    bundle = build_analysis_bundle(payload, current_model=current_model)
    q_pitch_mult = float(payload.get("q_pitch_mult", 1.0))
    q_speed_mult = float(payload.get("q_speed_mult", 1.0))
    r_effort_mult = float(payload.get("r_effort_mult", 1.0))
    q_base = np.diag([1.0, 10.0, 100.0, 50.0])
    r_base = np.diag([1.0, 0.5])
    q_eff = np.diag([
        q_base[0, 0] * max(1e-6, q_speed_mult),
        q_base[1, 1] * max(1e-6, q_pitch_mult),
        q_base[2, 2] * max(1e-6, q_pitch_mult),
        q_base[3, 3] * max(1e-6, q_pitch_mult),
    ])
    r_eff = r_base * max(1e-6, r_effort_mult)
    design = design_longitudinal_lqr(bundle["A"], bundle["B"], Q=q_eff, R=r_eff)
    eig_open = np.asarray(design.open_loop_eigenvalues, dtype=complex)
    eig_closed = np.asarray(design.closed_loop_eigenvalues, dtype=complex)
    max_re_open = float(np.max(np.real(eig_open)))
    max_re_closed = float(np.max(np.real(eig_closed)))
    return {
        "aircraft_id": bundle["model"].id,
        "V_mps": bundle["flight_condition"]["V_mps"],
        "flight_condition": bundle["flight_condition"],
        "trim": trim_response(bundle),
        "weights": {
            "q_pitch_mult": q_pitch_mult,
            "q_speed_mult": q_speed_mult,
            "r_effort_mult": r_effort_mult,
            "Q": q_eff.tolist(),
            "R": r_eff.tolist(),
        },
        "lqr": {
            "K": np.asarray(design.K, dtype=float).tolist(),
            "controllability_rank": int(design.controllability_rank),
            "controllability_condition": float(design.controllability_condition),
        },
        "open_loop": {
            "eigenvalues": _serialize_eigs(eig_open),
            "max_real_eig": max_re_open,
            "spectral_margin": float(-max_re_open),
            "min_damping_ratio": _min_damping(eig_open),
        },
        "closed_loop": {
            "eigenvalues": _serialize_eigs(eig_closed),
            "max_real_eig": max_re_closed,
            "spectral_margin": float(-max_re_closed),
            "min_damping_ratio": _min_damping(eig_closed),
        },
        "improvement": {
            "max_real_shift": float(max_re_open - max_re_closed),
            "damping_delta": None if _min_damping(eig_open) is None or _min_damping(eig_closed) is None else float(_min_damping(eig_closed) - _min_damping(eig_open)),
        },
    }


def step_response(payload: Dict[str, Any], current_model: AircraftModel | None = None) -> dict[str, Any]:
    bundle = build_analysis_bundle(payload, current_model=current_model)
    design = design_longitudinal_lqr(bundle["A"], bundle["B"])
    duration_s = float(payload.get("duration_s", 30.0))
    dt_s = float(payload.get("dt_s", 0.05))
    step_input = str(payload.get("input_channel", "elevator"))
    step_amplitude = float(payload.get("step_amplitude", np.deg2rad(2.0) if step_input == "elevator" else 0.08))
    include_closed = bool(payload.get("include_closed_loop", True))
    include_open = bool(payload.get("include_open_loop", True))
    turbulence_preview = bool(payload.get("turbulence_preview", False))
    n = int(np.floor(duration_s / dt_s)) + 1
    t = np.linspace(0.0, duration_s, n)
    x_trim = np.asarray(bundle["trim"].x0, dtype=float)
    u_trim = np.asarray(bundle["trim"].u0, dtype=float)
    A = np.asarray(bundle["A"], dtype=float)
    B = np.asarray(bundle["B"], dtype=float)
    state_names = ["airspeed_mps", "pitch_rad", "pitch_rate_radps", "altitude_m", "ground_distance_m"]

    def step_vec(tt: float) -> np.ndarray:
        du = np.zeros(4, dtype=float)
        if tt >= 0.5:
            if step_input == "throttle":
                du[0] = step_amplitude
            else:
                du[2] = step_amplitude
        return du

    def rk4_linear(x_dev: np.ndarray, u_dev: np.ndarray) -> np.ndarray:
        f = lambda xx: A @ np.clip(xx, -1e4, 1e4) + B @ np.clip(u_dev, -10.0, 10.0)
        k1 = f(x_dev)
        k2 = f(x_dev + 0.5 * dt_s * k1)
        k3 = f(x_dev + 0.5 * dt_s * k2)
        k4 = f(x_dev + dt_s * k3)
        next_state = x_dev + (dt_s / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)
        return np.nan_to_num(next_state, nan=0.0, posinf=1e6, neginf=-1e6)

    def project(x_dev: np.ndarray, tt: float) -> dict[str, float]:
        x_full = x_trim + x_dev
        u = float(x_full[int(StateIndex.U)])
        theta = float(x_full[int(StateIndex.THETA)])
        q = float(x_full[int(StateIndex.Q)])
        altitude = -float(x_full[int(StateIndex.Z)])
        ground_distance = float(x_full[int(StateIndex.X)] - bundle["flight_condition"]["headwind_mps"] * tt)
        return {
            "airspeed_mps": u,
            "pitch_rad": theta,
            "pitch_rate_radps": q,
            "altitude_m": altitude,
            "ground_distance_m": ground_distance,
        }

    traces: dict[str, dict[str, list[float]]] = {}
    for mode in ["open_loop", "closed_loop"]:
        if mode == "open_loop" and not include_open:
            continue
        if mode == "closed_loop" and not include_closed:
            continue
        x_dev = np.zeros(12, dtype=float)
        outputs = {name: [] for name in state_names}
        controls = {"elevator": [], "throttle": []}
        for tt in t:
            base_step = step_vec(float(tt))
            if mode == "closed_loop":
                lon_dev = x_dev[LONGITUDINAL_STATE_IDX_FULL]
                feedback = -(np.asarray(design.K, dtype=float) @ lon_dev)
                u_dev = base_step.copy()
                u_dev[2] += float(feedback[0])
                u_dev[0] += float(feedback[1])
            else:
                u_dev = base_step
            sample = project(x_dev, float(tt))
            for name, value in sample.items():
                outputs[name].append(float(value))
            controls["elevator"].append(float(u_trim[2] + u_dev[2]))
            controls["throttle"].append(float(u_trim[0] + u_dev[0]))
            x_dev = rk4_linear(x_dev, u_dev)
        traces[mode] = {**outputs, "controls_elevator": controls["elevator"], "controls_throttle": controls["throttle"]}

    closed_alt = np.asarray(traces.get("closed_loop", traces.get("open_loop", {})).get("altitude_m", []), dtype=float)
    closed_u = np.asarray(traces.get("closed_loop", traces.get("open_loop", {})).get("airspeed_mps", []), dtype=float)
    closed_theta = np.asarray(traces.get("closed_loop", traces.get("open_loop", {})).get("pitch_rad", []), dtype=float)
    trim_alt = -float(bundle["trim"].x0[int(StateIndex.Z)])
    trim_u = float(bundle["trim"].x0[int(StateIndex.U)])
    trim_theta = float(bundle["trim"].x0[int(StateIndex.THETA)])
    metrics = {
        "peak_altitude_overshoot_m": None if closed_alt.size == 0 else float(np.max(closed_alt - trim_alt)),
        "peak_airspeed_overshoot_mps": None if closed_u.size == 0 else float(np.max(closed_u - trim_u)),
        "steady_state_airspeed_error_mps": None if closed_u.size == 0 else float(closed_u[-1] - trim_u),
        "steady_state_altitude_error_m": None if closed_alt.size == 0 else float(closed_alt[-1] - trim_alt),
        "settling_time_s": _compute_settling_time(t, closed_u, trim_u),
        "pitch_settling_time_s": _compute_settling_time(t, closed_theta, trim_theta),
        "control_effort_peak": None if not traces else float(max(np.max(np.abs(traces[key]["controls_elevator"])) for key in traces)),
    }
    uncertainty = None
    if turbulence_preview and "closed_loop" in traces:
        base = np.asarray(traces["closed_loop"]["altitude_m"], dtype=float)
        sigma = 2.0 + 0.1 * abs(bundle["flight_condition"]["crosswind_mps"])
        uncertainty = {
            "altitude_upper": (base + sigma).tolist(),
            "altitude_lower": (base - sigma).tolist(),
        }

    return {
        "aircraft_id": bundle["model"].id,
        "flight_condition": bundle["flight_condition"],
        "time_s": t.tolist(),
        "step_input": {"channel": step_input, "amplitude": step_amplitude},
        "traces": traces,
        "metrics": metrics,
        "uncertainty": uncertainty,
        "spectral": control_response(payload, current_model=current_model),
    }


def estimation_response(payload: Dict[str, Any], current_model: AircraftModel | None = None) -> dict[str, Any]:
    model, fc = resolve_model_from_payload(payload, current_model=current_model)
    duration_s = float(payload.get("duration_s", 30.0))
    dt_s = float(payload.get("dt_s", 0.1))
    seed = int(payload.get("seed", 7))
    q_scale = float(payload.get("process_noise_scale", 1.0))
    r_scale = float(payload.get("measurement_noise_scale", 1.0))
    rng = np.random.default_rng(seed)
    ekf = AttitudeEKF(
        Q=np.diag([1e-5, 1e-5, 2e-5]) * max(q_scale, 1e-6),
    )
    t = np.arange(0.0, duration_s + 0.5 * dt_s, dt_s)
    truth = {"phi_rad": [], "theta_rad": [], "psi_rad": [], "x_m": [], "y_m": []}
    estimate = {"phi_rad": [], "theta_rad": [], "psi_rad": [], "x_m": [], "y_m": []}
    covariance_diag = []
    nis = []
    nees = []
    chi_bounds = {
        "nis_95": [float(chi2.ppf(0.025, df=1)), float(chi2.ppf(0.975, df=1))],
        "nees_95": [float(chi2.ppf(0.025, df=3)), float(chi2.ppf(0.975, df=3))],
    }
    x_truth = 0.0
    y_truth = 0.0
    x_est = 0.0
    y_est = 0.0
    V = fc["V_mps"]
    for tt in t:
        phi = float(np.deg2rad(8.0) * np.sin(0.22 * tt))
        theta = float(np.deg2rad(3.0) * np.sin(0.35 * tt + 0.4))
        psi = float(0.04 * tt + 0.18 * np.sin(0.12 * tt))
        phi2 = float(np.deg2rad(8.0) * 0.22 * np.cos(0.22 * tt))
        theta2 = float(np.deg2rad(3.0) * 0.35 * np.cos(0.35 * tt + 0.4))
        psi2 = float(0.04 + 0.18 * 0.12 * np.cos(0.12 * tt))
        p = phi2
        q = theta2
        r = psi2
        ekf.predict(
            p=float(p + rng.normal(0.0, 0.004 * r_scale)),
            q=float(q + rng.normal(0.0, 0.004 * r_scale)),
            r=float(r + rng.normal(0.0, 0.006 * r_scale)),
            dt=dt_s,
        )
        out = ekf.update_heading(float(psi + rng.normal(0.0, 0.05 * r_scale)), R_heading=(0.05 * max(r_scale, 1e-6)) ** 2)
        est_state = np.asarray(ekf.state, dtype=float)
        err = est_state - np.array([phi, theta, psi], dtype=float)
        covariance = np.diag(ekf.ekf.P).astype(float)
        nees_value = float(err.T @ np.linalg.solve(ekf.ekf.P, err))
        x_truth += dt_s * (V * np.cos(psi) - fc["headwind_mps"])
        y_truth += dt_s * (V * np.sin(psi) + fc["crosswind_mps"])
        x_est += dt_s * (V * np.cos(est_state[2]) - fc["headwind_mps"])
        y_est += dt_s * (V * np.sin(est_state[2]) + fc["crosswind_mps"])
        truth["phi_rad"].append(phi)
        truth["theta_rad"].append(theta)
        truth["psi_rad"].append(psi)
        truth["x_m"].append(float(x_truth))
        truth["y_m"].append(float(y_truth))
        estimate["phi_rad"].append(float(est_state[0]))
        estimate["theta_rad"].append(float(est_state[1]))
        estimate["psi_rad"].append(float(est_state[2]))
        estimate["x_m"].append(float(x_est))
        estimate["y_m"].append(float(y_est))
        covariance_diag.append(covariance.tolist())
        nis.append(float(out["nis"][0]))
        nees.append(nees_value)
    return {
        "aircraft_id": model.id,
        "flight_condition": fc,
        "time_s": t.tolist(),
        "truth": truth,
        "estimate": estimate,
        "covariance_diag": covariance_diag,
        "nis": nis,
        "nees": nees,
        "chi_square_bounds": chi_bounds,
    }


def frequency_response(payload: Dict[str, Any], current_model: AircraftModel | None = None) -> dict[str, Any]:
    bundle = build_analysis_bundle(payload, current_model=current_model)
    design = design_longitudinal_lqr(bundle["A"], bundle["B"])
    output_name = str(payload.get("output", "theta"))
    input_name = str(payload.get("input", "elevator"))
    lon_A = bundle["A"][np.ix_(LONGITUDINAL_STATE_IDX_FULL, LONGITUDINAL_STATE_IDX_FULL)]
    lon_B = bundle["B"][np.ix_(LONGITUDINAL_STATE_IDX_FULL, LONGITUDINAL_INPUT_IDX_FULL)]
    input_idx = 0 if input_name == "elevator" else 1
    output_idx = {"u": 0, "w": 1, "q": 2, "theta": 3}.get(output_name, 3)
    C = np.zeros((1, 4), dtype=float)
    C[0, output_idx] = 1.0
    D = np.zeros((1, 2), dtype=float)
    open_sys = signal.StateSpace(lon_A, lon_B, C, D)
    closed_sys = signal.StateSpace(lon_A - lon_B @ design.K, lon_B, C, D)
    w = np.logspace(-2, 2, 160)
    omega, h_open = signal.freqresp(signal.StateSpace(lon_A, lon_B[:, [input_idx]], C, np.zeros((1, 1))), w=w)
    _, h_closed = signal.freqresp(signal.StateSpace(lon_A - lon_B @ design.K, lon_B[:, [input_idx]], C, np.zeros((1, 1))), w=w)
    mag_open = 20.0 * np.log10(np.maximum(np.abs(h_open), 1e-12))
    mag_closed = 20.0 * np.log10(np.maximum(np.abs(h_closed), 1e-12))
    phase_open = np.rad2deg(np.unwrap(np.angle(h_open)))
    phase_closed = np.rad2deg(np.unwrap(np.angle(h_closed)))
    cross_indices = np.where(np.diff(np.sign(mag_open)) != 0)[0]
    wcp = float(omega[cross_indices[0]]) if cross_indices.size else None
    pm = None
    if cross_indices.size:
        pm = float(180.0 + phase_open[cross_indices[0]])
    return {
        "aircraft_id": bundle["model"].id,
        "flight_condition": bundle["flight_condition"],
        "omega_rad_s": omega.tolist(),
        "open_loop": {
            "magnitude_db": mag_open.tolist(),
            "phase_deg": phase_open.tolist(),
        },
        "closed_loop": {
            "magnitude_db": mag_closed.tolist(),
            "phase_deg": phase_closed.tolist(),
        },
        "margins": {
            "gain_margin": None,
            "phase_margin_deg": None if pm is None or not np.isfinite(pm) else float(pm),
            "cross_frequency_rad_s": None if wcp is None or not np.isfinite(wcp) else float(wcp),
        },
    }


def mode_shapes_response(payload: Dict[str, Any], current_model: AircraftModel | None = None) -> dict[str, Any]:
    bundle = build_analysis_bundle(payload, current_model=current_model)
    A = np.asarray(bundle["A"], dtype=float)[3:12, 3:12]
    eigvals, eigvecs = np.linalg.eig(A)
    mode_index = int(payload.get("mode_index", 0))
    mode_index = max(0, min(mode_index, eigvals.size - 1))
    vec = eigvecs[:, mode_index]
    names = ["u", "v", "w", "phi", "theta", "psi", "p", "q", "r"]
    magnitudes = np.abs(vec)
    if np.max(magnitudes) > 0:
        magnitudes = magnitudes / np.max(magnitudes)
    return {
        "aircraft_id": bundle["model"].id,
        "flight_condition": bundle["flight_condition"],
        "selected_mode_index": mode_index,
        "eigenvalue": {"real": float(np.real(eigvals[mode_index])), "imag": float(np.imag(eigvals[mode_index]))},
        "components": [{"state": name, "magnitude": float(mag)} for name, mag in zip(names, magnitudes)],
        "mode_summaries": bundle["modal_analysis"]["modes"],
    }


def validation_response(payload: Dict[str, Any], current_model: AircraftModel | None = None) -> dict[str, Any]:
    bundle = build_analysis_bundle(payload, current_model=current_model)
    trim = bundle["trim"]
    jac = validate_jacobian(trim.x0, trim.u0, params=bundle["model"].params, limits=bundle["model"].limits, seed=7)
    control = design_longitudinal_lqr(bundle["A"], bundle["B"])
    checks = [
        {
            "key": "trim_residual",
            "label": "Trim residual",
            "status": "pass" if trim.residual_norm < 1e-6 else "warn",
            "value": float(trim.residual_norm),
            "threshold": 1e-6,
            "explanation": "Residual below threshold indicates a physically consistent equilibrium.",
            "remediation": "Adjust aerodynamic derivatives or trim speed if this remains high.",
        },
        {
            "key": "jacobian_consistency",
            "label": "Jacobian consistency",
            "status": "pass" if jac.relative_error < 1e-3 else "warn",
            "value": float(jac.relative_error),
            "threshold": 1e-3,
            "explanation": "Directional finite-difference consistency confirms the linearization is locally reliable.",
            "remediation": "Check the state ordering or nonlinear derivative implementation.",
        },
        {
            "key": "longitudinal_controllability",
            "label": "Longitudinal controllability",
            "status": "pass" if int(control.controllability_rank) == 4 else "fail",
            "value": float(control.controllability_rank),
            "threshold": 4.0,
            "explanation": "Full longitudinal controllability is required for the LQR design to move all target states.",
            "remediation": "Revise elevator/throttle authority or unstable derivative combinations.",
        },
    ]
    if bool(payload.get("include_estimation", True)):
        est = estimation_response(payload, current_model=current_model)
        mean_nis = float(np.mean(est["nis"])) if est["nis"] else float("nan")
        nis_low, nis_high = est["chi_square_bounds"]["nis_95"]
        checks.append(
            {
                "key": "estimator_consistency",
                "label": "Estimator consistency",
                "status": "pass" if nis_low <= mean_nis <= nis_high else "warn",
                "value": mean_nis,
                "threshold": nis_high,
                "explanation": "Average NIS inside the chi-square acceptance band suggests the estimator is not grossly overconfident.",
                "remediation": "Retune process or measurement noise if NIS stays outside bounds.",
            }
        )
    comparison = None
    if bool(payload.get("compare_builtins", False)):
        comparison = []
        for aircraft_id in ["cessna_172r", "f16_research"]:
            alt_payload = dict(payload)
            alt_payload["aircraft_id"] = aircraft_id
            alt_payload.pop("custom_aircraft", None)
            alt_bundle = build_analysis_bundle(alt_payload)
            comparison.append(
                {
                    "aircraft_id": aircraft_id,
                    "trim_residual": float(alt_bundle["trim"].residual_norm),
                    "spectral_margin": float(alt_bundle["modal_analysis"]["spectral_margin"]),
                    "unstable_modes": int(alt_bundle["modal_analysis"]["unstable_modes"]),
                }
            )
    return {
        "aircraft_id": bundle["model"].id,
        "flight_condition": bundle["flight_condition"],
        "checks": checks,
        "comparison": comparison,
        "linearization": linearization_response(bundle),
    }
