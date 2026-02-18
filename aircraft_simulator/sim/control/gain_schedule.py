from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import numpy as np
from scipy import linalg

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.parameters import AircraftParameters, qbar
from aircraft_simulator.sim.control.linearize import linearize, select_subsystem
from aircraft_simulator.sim.model import xdot_full


def lqr(A: np.ndarray, B: np.ndarray, Q: np.ndarray, R: np.ndarray) -> np.ndarray:
    """Continuous-time LQR gain."""
    P = linalg.solve_continuous_are(A, B, Q, R)
    return np.linalg.solve(R, B.T @ P)


def _level_trim_guess(V_mps: float, params: AircraftParameters) -> tuple[np.ndarray, np.ndarray]:
    """
    Deterministic quasi-trim guess for level flight at speed V.
    This does not solve a full nonlinear trim NLP; it provides a physics-based
    operating point suitable for local linearization and gain scheduling.
    """
    V = float(max(5.0, V_mps))
    qd = qbar(params.rho_kgm3, V)

    cl_req = params.mass_kg * params.g_ms2 / (qd * params.S_m2)
    alpha = (cl_req - params.CL0) / max(1e-6, params.CL_alpha_per_rad)

    # Cm ~= Cm0 + Cm_alpha * alpha + Cm_de * de = 0
    cmde = params.Cm_de_per_rad if abs(params.Cm_de_per_rad) > 1e-6 else -1e-6
    de = -(params.Cm0 + params.Cm_alpha_per_rad * alpha) / cmde
    de = float(np.clip(de, -0.5, 0.5))

    cl = params.CL0 + params.CL_alpha_per_rad * alpha + params.CL_de_per_rad * de
    cd = params.CD0 + params.CD_k * cl * cl
    drag = qd * params.S_m2 * cd
    throttle = float(np.clip(drag / max(1e-6, params.max_thrust_N), 0.0, 1.0))

    # State ordering follows sim.state.State.as_vector():
    # [x, y, z, u, v, w, phi, theta, psi, p, q, r]
    u = V * np.cos(alpha)
    w = V * np.sin(alpha)
    x0 = np.array([0.0, 0.0, -1000.0, u, 0.0, w, 0.0, alpha, 0.0, 0.0, 0.0, 0.0], dtype=float)

    # [throttle, aileron, elevator, rudder]
    u0 = np.array([throttle, 0.0, de, 0.0], dtype=float)
    return x0, u0


def linearize_aircraft(
    V_mps: float,
    *,
    params: AircraftParameters | None = None,
    longitudinal: bool = True,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Linearize the nonlinear 6DOF model around a quasi-trim operating point.

    Returns longitudinal subsystem by default:
      x_lon = [u, w, q, theta], u_lon = [elevator]
    """
    params = params or AircraftParameters()
    x0, u0 = _level_trim_guess(V_mps, params)

    def f(x: np.ndarray, u_vec: np.ndarray) -> np.ndarray:
        ctrl = ControlInputs(
            throttle=float(u_vec[0]),
            aileron=float(u_vec[1]),
            elevator=float(u_vec[2]),
            rudder=float(u_vec[3]),
        )
        return xdot_full(x, ctrl, params=params)

    A, B = linearize(f, x0, u0)

    if not longitudinal:
        return A, B

    # Indices in full state/input vectors.
    state_idx = [3, 5, 10, 7]  # u, w, q, theta
    input_idx = [2]            # elevator
    return select_subsystem(A, B, state_idx=state_idx, input_idx=input_idx)


@dataclass(frozen=True)
class GainSchedule:
    speeds_mps: np.ndarray
    gains: np.ndarray  # shape (n_speeds, n_u, n_x)

    def interpolate(self, V_mps: float) -> np.ndarray:
        speeds = np.asarray(self.speeds_mps, dtype=float).reshape(-1)
        Ktab = np.asarray(self.gains, dtype=float)
        if Ktab.ndim != 3:
            raise ValueError("gains must be rank-3: (n_speeds, n_u, n_x)")
        if Ktab.shape[0] != speeds.size:
            raise ValueError("speeds/gains length mismatch")

        V = float(np.clip(V_mps, speeds.min(), speeds.max()))
        n_u, n_x = Ktab.shape[1], Ktab.shape[2]
        K = np.zeros((n_u, n_x), dtype=float)
        for i in range(n_u):
            for j in range(n_x):
                K[i, j] = np.interp(V, speeds, Ktab[:, i, j])
        return K


def build_gain_schedule(
    speeds_mps: Sequence[float] = (40.0, 60.0, 80.0),
    *,
    params: AircraftParameters | None = None,
    Q: np.ndarray | None = None,
    R: np.ndarray | None = None,
) -> GainSchedule:
    """
    Build LQR gain schedule over speed using model-based linearization.
    Default is longitudinal 4-state, 1-input schedule.
    """
    params = params or AircraftParameters()
    speeds = np.asarray(speeds_mps, dtype=float)
    if speeds.ndim != 1 or speeds.size < 2:
        raise ValueError("speeds_mps must contain at least two speeds")

    # Default weights for [u, w, q, theta] and [de]
    Qeff = np.diag([1.0, 10.0, 100.0, 50.0]) if Q is None else np.asarray(Q, dtype=float)
    Reff = np.array([[1.0]]) if R is None else np.asarray(R, dtype=float)

    gains = []
    for V in speeds:
        A, B = linearize_aircraft(float(V), params=params, longitudinal=True)
        gains.append(lqr(A, B, Qeff, Reff))

    return GainSchedule(speeds_mps=speeds, gains=np.stack(gains, axis=0))
