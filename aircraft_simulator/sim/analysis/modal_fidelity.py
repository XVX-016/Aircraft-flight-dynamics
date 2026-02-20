from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.signal import find_peaks

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.forces_moments import ActuatorLimits
from aircraft_simulator.sim.aircraft.parameters import AircraftParameters
from aircraft_simulator.sim.analysis.lqr_longitudinal import LONGITUDINAL_STATE_IDX_FULL
from aircraft_simulator.sim.analysis.trim import TrimResult
from aircraft_simulator.sim.dynamics.integrator import rk4_step
from aircraft_simulator.sim.model import xdot_full


@dataclass(frozen=True)
class LinearModePrediction:
    eigenvalue_real: float
    eigenvalue_imag: float
    sigma: float
    omega_d: float
    wn: float
    zeta: float
    period_s: float


@dataclass(frozen=True)
class NonlinearModeEstimate:
    sigma: float
    omega_d: float
    wn: float
    zeta: float
    period_s: float
    num_peaks: int


@dataclass(frozen=True)
class ModalFidelityResult:
    linear: LinearModePrediction
    nonlinear: NonlinearModeEstimate
    sigma_error_percent: float
    omega_error_percent: float
    zeta_error_percent: float


@dataclass(frozen=True)
class UnstableGrowthEstimate:
    sigma_linear: float
    sigma_nonlinear: float
    sigma_error_percent: float
    fit_window_s: tuple[float, float]


def _apply_alpha_perturbation(x_trim: np.ndarray, alpha_perturb_deg: float) -> np.ndarray:
    x0 = np.asarray(x_trim, dtype=float).copy()
    delta = float(np.deg2rad(alpha_perturb_deg))
    V = float(np.hypot(x0[3], x0[5]))
    alpha0 = float(np.arctan2(x0[5], x0[3]))
    alpha1 = alpha0 + delta
    x0[3] = V * np.cos(alpha1)
    x0[5] = V * np.sin(alpha1)
    return x0


def _controller_from_state(
    x: np.ndarray,
    *,
    x_trim: np.ndarray,
    u_trim: np.ndarray,
    limits: ActuatorLimits,
    K: np.ndarray | None,
) -> ControlInputs:
    if K is None:
        return ControlInputs(
            throttle=float(u_trim[0]),
            aileron=0.0,
            elevator=float(u_trim[2]),
            rudder=0.0,
        )
    x_sub = np.asarray(x, dtype=float)[LONGITUDINAL_STATE_IDX_FULL]
    x_ref = np.asarray(x_trim, dtype=float)[LONGITUDINAL_STATE_IDX_FULL]
    du = -np.asarray(K, dtype=float) @ (x_sub - x_ref)
    de = float(np.clip(float(u_trim[2]) + float(du[0]), -limits.elevator_max_rad, limits.elevator_max_rad))
    thr = float(np.clip(float(u_trim[0]) + float(du[1]), 0.0, 1.0))
    return ControlInputs(throttle=thr, aileron=0.0, elevator=de, rudder=0.0)


def _simulate_response(
    *,
    params: AircraftParameters,
    limits: ActuatorLimits,
    trim: TrimResult,
    K: np.ndarray | None,
    tfinal_s: float,
    dt_s: float,
    alpha_perturb_deg: float,
) -> tuple[np.ndarray, np.ndarray]:
    t_hist = np.arange(0.0, tfinal_s + 0.5 * dt_s, dt_s)
    x = _apply_alpha_perturbation(trim.x0, alpha_perturb_deg=alpha_perturb_deg)
    x_hist = np.zeros((t_hist.size, 12), dtype=float)

    def f_dyn(tt: float, xx: np.ndarray) -> np.ndarray:
        ctrl = _controller_from_state(
            xx,
            x_trim=trim.x0,
            u_trim=trim.u0,
            limits=limits,
            K=K,
        )
        return xdot_full(xx, ctrl, params=params, limits=limits)

    for i, tt in enumerate(t_hist):
        x_hist[i] = x
        if i < t_hist.size - 1:
            x = rk4_step(f_dyn, float(tt), x, dt_s)
    return t_hist, x_hist


def _relative_error_percent(estimate: float, reference: float) -> float:
    return 100.0 * abs(estimate - reference) / max(1e-12, abs(reference))


def select_longitudinal_complex_mode(A_lon: np.ndarray, *, preference: str = "short_period") -> complex:
    eigvals = np.linalg.eigvals(np.asarray(A_lon, dtype=float))
    complex_modes = [ev for ev in eigvals if abs(float(np.imag(ev))) > 1e-10 and float(np.imag(ev)) > 0.0]
    if not complex_modes:
        raise RuntimeError("No complex longitudinal mode found.")
    if preference == "short_period":
        return max(complex_modes, key=lambda ev: abs(float(np.imag(ev))))
    if preference == "phugoid":
        return min(complex_modes, key=lambda ev: abs(float(np.imag(ev))))
    raise ValueError(f"Unknown preference '{preference}'.")


def linear_prediction_from_eigenvalue(ev: complex) -> LinearModePrediction:
    sigma = float(np.real(ev))
    omega = float(np.imag(ev))
    wn = float(np.hypot(sigma, omega))
    zeta = float(-sigma / max(1e-12, wn))
    period = float(2.0 * np.pi / max(1e-12, abs(omega)))
    return LinearModePrediction(
        eigenvalue_real=sigma,
        eigenvalue_imag=omega,
        sigma=sigma,
        omega_d=abs(omega),
        wn=wn,
        zeta=zeta,
        period_s=period,
    )


def estimate_mode_from_signal(
    t: np.ndarray,
    y: np.ndarray,
    *,
    min_prominence_ratio: float = 0.02,
    min_peak_distance_s: float = 0.05,
) -> NonlinearModeEstimate:
    tt = np.asarray(t, dtype=float).reshape(-1)
    yy = np.asarray(y, dtype=float).reshape(-1)
    if tt.size != yy.size or tt.size < 8:
        raise ValueError("Need matching time/signal arrays with at least 8 samples.")

    y0 = float(yy[0])
    sig = yy - y0
    amp = float(np.max(np.abs(sig)))
    if amp <= 1e-12:
        raise RuntimeError("Signal amplitude too small for modal estimation.")

    dt = float(np.median(np.diff(tt)))
    min_distance = max(1, int(np.ceil(min_peak_distance_s / max(1e-9, dt))))
    prominence = max(1e-12, min_prominence_ratio * amp)
    peaks, _ = find_peaks(np.abs(sig), prominence=prominence, distance=min_distance)
    if peaks.size < 2:
        raise RuntimeError(f"Insufficient peaks for estimation: found {peaks.size}.")

    t_peaks = tt[peaks]
    ap = np.abs(sig[peaks])
    periods = 2.0 * np.diff(t_peaks)  # abs() peaks occur every half-cycle
    if periods.size == 0 or np.any(periods <= 0.0):
        raise RuntimeError("Invalid peak periods detected.")
    period = float(np.mean(periods))
    omega_d = float(2.0 * np.pi / period)

    coeffs = np.polyfit(t_peaks, np.log(np.maximum(ap, 1e-15)), 1)
    sigma = float(coeffs[0])  # exponential envelope exp(sigma*t)
    wn = float(np.hypot(sigma, omega_d))
    zeta = float(-sigma / max(1e-12, wn))
    return NonlinearModeEstimate(
        sigma=sigma,
        omega_d=omega_d,
        wn=wn,
        zeta=zeta,
        period_s=period,
        num_peaks=int(peaks.size),
    )


def validate_modal_fidelity(
    *,
    params: AircraftParameters,
    limits: ActuatorLimits,
    trim: TrimResult,
    eigenvalue: complex,
    K: np.ndarray | None,
    tfinal_s: float = 10.0,
    dt_s: float = 0.01,
    alpha_perturb_deg: float = 0.5,
    signal: str = "q",
) -> ModalFidelityResult:
    linear = linear_prediction_from_eigenvalue(eigenvalue)
    t_hist, x_hist = _simulate_response(
        params=params,
        limits=limits,
        trim=trim,
        K=K,
        tfinal_s=tfinal_s,
        dt_s=dt_s,
        alpha_perturb_deg=alpha_perturb_deg,
    )

    if signal == "q":
        y = x_hist[:, 10]
    elif signal == "alpha":
        y = np.arctan2(x_hist[:, 5], x_hist[:, 3])
    else:
        raise ValueError(f"Unsupported signal '{signal}'.")

    nonlinear = estimate_mode_from_signal(t_hist, y)
    return ModalFidelityResult(
        linear=linear,
        nonlinear=nonlinear,
        sigma_error_percent=_relative_error_percent(nonlinear.sigma, linear.sigma),
        omega_error_percent=_relative_error_percent(nonlinear.omega_d, linear.omega_d),
        zeta_error_percent=_relative_error_percent(nonlinear.zeta, linear.zeta),
    )


def estimate_unstable_growth_rate(
    *,
    params: AircraftParameters,
    limits: ActuatorLimits,
    trim: TrimResult,
    sigma_linear: float,
    tfinal_s: float = 3.0,
    dt_s: float = 0.01,
    alpha_perturb_deg: float = 0.5,
    fit_window_s: tuple[float, float] = (0.4, 2.0),
) -> UnstableGrowthEstimate:
    t_hist, x_hist = _simulate_response(
        params=params,
        limits=limits,
        trim=trim,
        K=None,
        tfinal_s=tfinal_s,
        dt_s=dt_s,
        alpha_perturb_deg=alpha_perturb_deg,
    )
    x_ref = np.asarray(trim.x0, dtype=float)
    idx = np.asarray(LONGITUDINAL_STATE_IDX_FULL, dtype=int)
    err = np.linalg.norm(x_hist[:, idx] - x_ref[idx], axis=1)

    t0, t1 = fit_window_s
    mask = (t_hist >= float(t0)) & (t_hist <= float(t1))
    tt = t_hist[mask]
    ee = err[mask]
    if tt.size < 6:
        raise RuntimeError("Insufficient samples in fit window for growth estimation.")
    coeffs = np.polyfit(tt, np.log(np.maximum(ee, 1e-15)), 1)
    sigma_est = float(coeffs[0])
    return UnstableGrowthEstimate(
        sigma_linear=float(sigma_linear),
        sigma_nonlinear=sigma_est,
        sigma_error_percent=_relative_error_percent(sigma_est, sigma_linear),
        fit_window_s=(float(t0), float(t1)),
    )
