from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import linalg

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.forces_moments import ActuatorLimits
from aircraft_simulator.sim.aircraft.parameters import AircraftParameters
from aircraft_simulator.sim.analysis.trim import TrimResult
from aircraft_simulator.sim.dynamics.integrator import rk4_step
from aircraft_simulator.sim.model import xdot_full


LONGITUDINAL_STATE_IDX_FULL = [3, 5, 10, 7]  # [u, w, q, theta]
LONGITUDINAL_INPUT_IDX_FULL = [2, 0]         # [elevator, throttle]


@dataclass(frozen=True)
class LongitudinalLqrDesign:
    A_lon: np.ndarray
    B_lon: np.ndarray
    K: np.ndarray
    controllability_rank: int
    controllability_condition: float
    open_loop_eigenvalues: np.ndarray
    closed_loop_eigenvalues: np.ndarray
    max_real_open: float
    max_real_closed: float
    Q: np.ndarray
    R: np.ndarray


@dataclass(frozen=True)
class LongitudinalResponseMetrics:
    peak_q_radps: float
    final_longitudinal_error_norm: float
    settling_time_s: float | None


@dataclass(frozen=True)
class OpenClosedResponseComparison:
    open_loop: LongitudinalResponseMetrics
    closed_loop: LongitudinalResponseMetrics


def extract_longitudinal_subsystem(A_full: np.ndarray, B_full: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    A = np.asarray(A_full, dtype=float)
    B = np.asarray(B_full, dtype=float)
    A_lon = A[np.ix_(LONGITUDINAL_STATE_IDX_FULL, LONGITUDINAL_STATE_IDX_FULL)]
    B_lon = B[np.ix_(LONGITUDINAL_STATE_IDX_FULL, LONGITUDINAL_INPUT_IDX_FULL)]
    return A_lon, B_lon


def controllability_matrix(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    n = A.shape[0]
    blocks = [B]
    Ak = np.eye(n)
    for _ in range(1, n):
        Ak = Ak @ A
        blocks.append(Ak @ B)
    return np.hstack(blocks)


def design_longitudinal_lqr(
    A_full: np.ndarray,
    B_full: np.ndarray,
    *,
    Q: np.ndarray | None = None,
    R: np.ndarray | None = None,
) -> LongitudinalLqrDesign:
    A_lon, B_lon = extract_longitudinal_subsystem(A_full, B_full)

    Qeff = np.diag([1.0, 10.0, 100.0, 50.0]) if Q is None else np.asarray(Q, dtype=float)
    Reff = np.diag([1.0, 0.5]) if R is None else np.asarray(R, dtype=float)

    C = controllability_matrix(A_lon, B_lon)
    rank = int(np.linalg.matrix_rank(C))
    cond = float(np.linalg.cond(C))
    if rank < A_lon.shape[0]:
        raise RuntimeError(f"Longitudinal subsystem not controllable: rank={rank}, n={A_lon.shape[0]}")

    P = linalg.solve_continuous_are(A_lon, B_lon, Qeff, Reff)
    K = np.linalg.solve(Reff, B_lon.T @ P)

    eig_open = np.linalg.eigvals(A_lon)
    eig_closed = np.linalg.eigvals(A_lon - B_lon @ K)
    max_real_open = float(np.max(np.real(eig_open)))
    max_real_closed = float(np.max(np.real(eig_closed)))

    return LongitudinalLqrDesign(
        A_lon=A_lon,
        B_lon=B_lon,
        K=K,
        controllability_rank=rank,
        controllability_condition=cond,
        open_loop_eigenvalues=eig_open,
        closed_loop_eigenvalues=eig_closed,
        max_real_open=max_real_open,
        max_real_closed=max_real_closed,
        Q=Qeff,
        R=Reff,
    )


def _apply_alpha_perturbation(x_trim: np.ndarray, alpha_perturb_deg: float) -> np.ndarray:
    x0 = np.asarray(x_trim, dtype=float).copy()
    delta = float(np.deg2rad(alpha_perturb_deg))
    V = float(np.hypot(x0[3], x0[5]))
    alpha0 = float(np.arctan2(x0[5], x0[3]))
    alpha1 = alpha0 + delta
    x0[3] = V * np.cos(alpha1)
    x0[5] = V * np.sin(alpha1)
    return x0


def _longitudinal_error_norm(x: np.ndarray, x_trim: np.ndarray) -> float:
    idx = np.asarray(LONGITUDINAL_STATE_IDX_FULL, dtype=int)
    return float(np.linalg.norm(np.asarray(x)[idx] - np.asarray(x_trim)[idx]))


def _settling_time(
    t_hist: np.ndarray,
    err_hist: np.ndarray,
    *,
    threshold: float,
) -> float | None:
    above = np.where(err_hist > threshold)[0]
    if above.size == 0:
        return 0.0
    last_above = int(above[-1])
    if last_above >= len(t_hist) - 1:
        return None
    return float(t_hist[last_above + 1])


def simulate_longitudinal_perturbation(
    *,
    params: AircraftParameters,
    limits: ActuatorLimits,
    trim: TrimResult,
    K: np.ndarray | None,
    tfinal_s: float = 5.0,
    dt_s: float = 0.01,
    alpha_perturb_deg: float = 0.5,
) -> LongitudinalResponseMetrics:
    x_trim = np.asarray(trim.x0, dtype=float)
    u_trim = np.asarray(trim.u0, dtype=float)
    x = _apply_alpha_perturbation(x_trim, alpha_perturb_deg=alpha_perturb_deg)

    t_hist = np.arange(0.0, tfinal_s + 0.5 * dt_s, dt_s)
    err_hist = np.zeros_like(t_hist)
    peak_q = 0.0

    def control_from_state(xi: np.ndarray) -> ControlInputs:
        if K is None:
            return ControlInputs(
                throttle=float(u_trim[0]),
                aileron=0.0,
                elevator=float(u_trim[2]),
                rudder=0.0,
            )
        x_sub = np.asarray(xi, dtype=float)[LONGITUDINAL_STATE_IDX_FULL]
        x_ref = x_trim[LONGITUDINAL_STATE_IDX_FULL]
        du = -np.asarray(K, dtype=float) @ (x_sub - x_ref)
        de = float(np.clip(u_trim[2] + du[0], -limits.elevator_max_rad, limits.elevator_max_rad))
        thr = float(np.clip(u_trim[0] + du[1], 0.0, 1.0))
        return ControlInputs(throttle=thr, aileron=0.0, elevator=de, rudder=0.0)

    def f_dyn(tt: float, xx: np.ndarray) -> np.ndarray:
        ctrl = control_from_state(xx)
        return xdot_full(xx, ctrl, params=params, limits=limits)

    for i, tt in enumerate(t_hist):
        err_hist[i] = _longitudinal_error_norm(x, x_trim)
        peak_q = max(peak_q, abs(float(x[10])))
        if i < len(t_hist) - 1:
            x = rk4_step(f_dyn, float(tt), x, dt_s)

    threshold = 0.02 * max(1e-9, float(err_hist[0]))
    settling = _settling_time(t_hist, err_hist, threshold=threshold)
    return LongitudinalResponseMetrics(
        peak_q_radps=float(peak_q),
        final_longitudinal_error_norm=float(err_hist[-1]),
        settling_time_s=settling,
    )


def compare_open_closed_longitudinal_response(
    *,
    params: AircraftParameters,
    limits: ActuatorLimits,
    trim: TrimResult,
    K: np.ndarray,
    tfinal_s: float = 5.0,
    dt_s: float = 0.01,
    alpha_perturb_deg: float = 0.5,
) -> OpenClosedResponseComparison:
    open_metrics = simulate_longitudinal_perturbation(
        params=params,
        limits=limits,
        trim=trim,
        K=None,
        tfinal_s=tfinal_s,
        dt_s=dt_s,
        alpha_perturb_deg=alpha_perturb_deg,
    )
    closed_metrics = simulate_longitudinal_perturbation(
        params=params,
        limits=limits,
        trim=trim,
        K=K,
        tfinal_s=tfinal_s,
        dt_s=dt_s,
        alpha_perturb_deg=alpha_perturb_deg,
    )
    return OpenClosedResponseComparison(open_loop=open_metrics, closed_loop=closed_metrics)
