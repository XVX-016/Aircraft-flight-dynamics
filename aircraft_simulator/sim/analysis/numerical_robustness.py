from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.forces_moments import ActuatorLimits
from aircraft_simulator.sim.aircraft.parameters import AircraftParameters
from aircraft_simulator.sim.analysis.modal_estimators import estimator_invariance_from_signal, extract_peak_series
from aircraft_simulator.sim.analysis.modal_fidelity import linear_prediction_from_eigenvalue
from aircraft_simulator.sim.analysis.trim import TrimResult
from aircraft_simulator.sim.dynamics.integrator import rk4_step
from aircraft_simulator.sim.model import xdot_full


@dataclass(frozen=True)
class DtSweepPoint:
    dt_s: float
    sigma: float
    omega_d: float
    zeta: float
    sigma_error_percent: float
    omega_error_percent: float
    zeta_error_percent: float
    num_peaks: int
    r2_envelope: float
    r2_energy: float
    period_consistency_ratio: float


@dataclass(frozen=True)
class DtConvergenceResult:
    points: list[DtSweepPoint]
    p_sigma: float | None
    p_omega: float | None
    p_zeta: float | None
    monotonic_sigma: bool
    monotonic_omega: bool
    monotonic_zeta: bool
    delta_dt23_sigma: float
    delta_dt23_omega: float
    delta_dt23_zeta: float


@dataclass(frozen=True)
class AmplitudeSweepPoint:
    alpha_perturb_deg: float
    sigma: float
    omega_d: float
    zeta: float
    sigma_error_percent: float
    omega_error_percent: float
    zeta_error_percent: float
    num_peaks: int
    r2_envelope: float
    r2_energy: float
    period_consistency_ratio: float


@dataclass(frozen=True)
class AmplitudeSweepResult:
    points: list[AmplitudeSweepPoint]
    monotonic_sigma_error: bool
    monotonic_omega_error: bool
    monotonic_zeta_error: bool


def _relative_error_percent(value: float, ref: float) -> float:
    return 100.0 * abs(value - ref) / max(1e-12, abs(ref))


def _apply_alpha_perturbation(x_trim: np.ndarray, alpha_perturb_deg: float) -> np.ndarray:
    x = np.asarray(x_trim, dtype=float).copy()
    V = float(np.hypot(x[3], x[5]))
    alpha = float(np.arctan2(x[5], x[3]) + np.deg2rad(alpha_perturb_deg))
    x[3] = V * np.cos(alpha)
    x[5] = V * np.sin(alpha)
    return x


def _simulate_signal(
    *,
    params: AircraftParameters,
    limits: ActuatorLimits,
    trim: TrimResult,
    dt_s: float,
    tfinal_s: float,
    alpha_perturb_deg: float,
    signal: str,
) -> tuple[np.ndarray, np.ndarray]:
    t = np.arange(0.0, tfinal_s + 0.5 * dt_s, dt_s)
    x = _apply_alpha_perturbation(trim.x0, alpha_perturb_deg=alpha_perturb_deg)
    x0 = np.asarray(trim.x0, dtype=float)

    u_trim = np.asarray(trim.u0, dtype=float)
    ctrl = ControlInputs(
        throttle=float(u_trim[0]),
        aileron=0.0,
        elevator=float(u_trim[2]),
        rudder=0.0,
    )

    y = np.zeros_like(t)
    for i, tt in enumerate(t):
        if signal == "w":
            y[i] = float(x[5] - x0[5])
        elif signal == "q":
            y[i] = float(x[10] - x0[10])
        elif signal == "alpha":
            y[i] = float(np.arctan2(x[5], x[3]) - np.arctan2(x0[5], x0[3]))
        else:
            raise ValueError(f"Unsupported signal '{signal}'")
        if i < t.size - 1:
            x = rk4_step(
                lambda _t, xx: xdot_full(xx, ctrl, params=params, limits=limits),
                float(tt),
                x,
                dt_s,
            )
    return t, y


def _observed_order(errors: list[float], *, tol: float = 1e-9) -> float | None:
    if len(errors) != 3:
        return None
    d12 = abs(errors[0] - errors[1])
    d23 = abs(errors[1] - errors[2])
    if d12 < tol or d23 < tol:
        return None
    return float(np.log(d12 / d23) / np.log(2.0))


def _is_monotonic(errors: list[float], *, tol: float = 1e-9) -> bool:
    if len(errors) != 3:
        return False
    return abs(errors[1] - errors[2]) <= abs(errors[0] - errors[1]) + tol


def run_dt_convergence(
    *,
    params: AircraftParameters,
    limits: ActuatorLimits,
    trim: TrimResult,
    eigenvalue: complex,
    dt_values_s: tuple[float, float, float] = (0.01, 0.005, 0.0025),
    alpha_perturb_deg: float = 0.5,
    signal: str = "w",
) -> DtConvergenceResult:
    linear = linear_prediction_from_eigenvalue(eigenvalue)
    tfinal_s = max(10.0, 5.0 * linear.period_s)

    points: list[DtSweepPoint] = []
    for dt in dt_values_s:
        t, y = _simulate_signal(
            params=params,
            limits=limits,
            trim=trim,
            dt_s=float(dt),
            tfinal_s=float(tfinal_s),
            alpha_perturb_deg=float(alpha_perturb_deg),
            signal=signal,
        )
        inv = estimator_invariance_from_signal(t, y, min_peak_distance_s=0.05)
        peaks = extract_peak_series(t, y, min_peak_distance_s=0.05)
        omega = float(2.0 * np.pi / peaks.period_full_s)
        wn = float(np.hypot(inv.sigma_peak, omega))
        zeta = float(-inv.sigma_peak / max(1e-12, wn))

        points.append(
            DtSweepPoint(
                dt_s=float(dt),
                sigma=float(inv.sigma_peak),
                omega_d=omega,
                zeta=zeta,
                sigma_error_percent=_relative_error_percent(inv.sigma_peak, linear.sigma),
                omega_error_percent=_relative_error_percent(omega, linear.omega_d),
                zeta_error_percent=_relative_error_percent(zeta, linear.zeta),
                num_peaks=int(inv.num_peaks),
                r2_envelope=float(inv.r2_envelope),
                r2_energy=float(inv.r2_energy),
                period_consistency_ratio=float(inv.period_consistency_ratio),
            )
        )

    sigma_errors = [p.sigma_error_percent for p in points]
    omega_errors = [p.omega_error_percent for p in points]
    zeta_errors = [p.zeta_error_percent for p in points]
    return DtConvergenceResult(
        points=points,
        p_sigma=_observed_order(sigma_errors),
        p_omega=_observed_order(omega_errors),
        p_zeta=_observed_order(zeta_errors),
        monotonic_sigma=_is_monotonic(sigma_errors),
        monotonic_omega=_is_monotonic(omega_errors),
        monotonic_zeta=_is_monotonic(zeta_errors),
        delta_dt23_sigma=float(abs(points[2].sigma - points[1].sigma)),
        delta_dt23_omega=float(abs(points[2].omega_d - points[1].omega_d)),
        delta_dt23_zeta=float(abs(points[2].zeta - points[1].zeta)),
    )


def run_amplitude_sweep(
    *,
    params: AircraftParameters,
    limits: ActuatorLimits,
    trim: TrimResult,
    eigenvalue: complex,
    amplitudes_deg: tuple[float, float, float, float] = (0.1, 0.5, 1.0, 2.0),
    dt_s: float = 0.005,
    signal: str = "w",
) -> AmplitudeSweepResult:
    linear = linear_prediction_from_eigenvalue(eigenvalue)
    tfinal_s = max(10.0, 5.0 * linear.period_s)

    points: list[AmplitudeSweepPoint] = []
    for amp_deg in amplitudes_deg:
        t, y = _simulate_signal(
            params=params,
            limits=limits,
            trim=trim,
            dt_s=float(dt_s),
            tfinal_s=float(tfinal_s),
            alpha_perturb_deg=float(amp_deg),
            signal=signal,
        )
        inv = estimator_invariance_from_signal(t, y, min_peak_distance_s=0.05)
        peaks = extract_peak_series(t, y, min_peak_distance_s=0.05)
        omega = float(2.0 * np.pi / peaks.period_full_s)
        wn = float(np.hypot(inv.sigma_peak, omega))
        zeta = float(-inv.sigma_peak / max(1e-12, wn))
        points.append(
            AmplitudeSweepPoint(
                alpha_perturb_deg=float(amp_deg),
                sigma=float(inv.sigma_peak),
                omega_d=omega,
                zeta=zeta,
                sigma_error_percent=_relative_error_percent(inv.sigma_peak, linear.sigma),
                omega_error_percent=_relative_error_percent(omega, linear.omega_d),
                zeta_error_percent=_relative_error_percent(zeta, linear.zeta),
                num_peaks=int(inv.num_peaks),
                r2_envelope=float(inv.r2_envelope),
                r2_energy=float(inv.r2_energy),
                period_consistency_ratio=float(inv.period_consistency_ratio),
            )
        )

    sigma_err = [p.sigma_error_percent for p in points]
    omega_err = [p.omega_error_percent for p in points]
    zeta_err = [p.zeta_error_percent for p in points]
    return AmplitudeSweepResult(
        points=points,
        monotonic_sigma_error=all(sigma_err[i + 1] >= sigma_err[i] - 0.5 for i in range(len(sigma_err) - 1)),
        monotonic_omega_error=all(omega_err[i + 1] >= omega_err[i] - 0.5 for i in range(len(omega_err) - 1)),
        monotonic_zeta_error=all(zeta_err[i + 1] >= zeta_err[i] - 0.5 for i in range(len(zeta_err) - 1)),
    )
