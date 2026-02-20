from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import least_squares

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.forces_moments import ActuatorLimits
from aircraft_simulator.sim.aircraft.parameters import AircraftParameters, qbar
from aircraft_simulator.sim.model import xdot_full


@dataclass(frozen=True)
class TrimResult:
    x0: np.ndarray
    u0: np.ndarray
    alpha: float
    theta: float
    throttle: float
    elevator: float
    residual_norm: float
    success: bool
    nfev: int


def _compute_level_trim_quasi_guess(V_mps: float, params: AircraftParameters) -> TrimResult:
    """
    Deterministic quasi-trim guess for level flight at speed V.
    This does not solve a full nonlinear trim NLP.
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
    ctrl = ControlInputs(throttle=throttle, aileron=0.0, elevator=de, rudder=0.0)
    residual = xdot_full(x0, ctrl, params=params)
    # Ignore inertial position kinematics (dx,dy,dz); focus on dynamic equilibrium.
    residual_norm = float(np.linalg.norm(residual[3:12]))

    return TrimResult(
        x0=x0,
        u0=u0,
        alpha=float(alpha),
        theta=float(alpha),
        throttle=throttle,
        elevator=de,
        residual_norm=residual_norm,
        success=True,
        nfev=0,
    )


def compute_level_trim(
    V_mps: float,
    params: AircraftParameters,
    *,
    limits: ActuatorLimits | None = None,
    residual_tol: float = 1e-6,
) -> TrimResult:
    """
    Nonlinear level-flight trim solve (longitudinal baseline).

    Unknowns z = [alpha, theta, elevator, throttle]
    Residual r = [u_dot, w_dot, q_dot, theta - alpha]
    """
    limits = limits or ActuatorLimits()
    V = float(max(5.0, V_mps))
    guess = _compute_level_trim_quasi_guess(V, params)

    # z = [alpha, theta, de, throttle]
    z0 = np.array(
        [
            guess.alpha,
            guess.theta,
            guess.elevator,
            guess.throttle,
        ],
        dtype=float,
    )

    bounds_lo = np.array(
        [
            np.deg2rad(-20.0),                  # alpha
            np.deg2rad(-20.0),                  # theta
            -limits.elevator_max_rad,           # de
            0.0,                                # throttle
        ],
        dtype=float,
    )
    bounds_hi = np.array(
        [
            np.deg2rad(25.0),                   # alpha
            np.deg2rad(25.0),                   # theta
            limits.elevator_max_rad,            # de
            1.0,                                # throttle
        ],
        dtype=float,
    )

    def residual(z: np.ndarray) -> np.ndarray:
        alpha, theta, de, throttle = [float(v) for v in z]
        u = V * np.cos(alpha)
        w = V * np.sin(alpha)

        # [x, y, z, u, v, w, phi, theta, psi, p, q, r]
        x = np.zeros(12, dtype=float)
        x[3] = u
        x[5] = w
        x[7] = theta

        ctrl = ControlInputs(
            throttle=throttle,
            aileron=0.0,
            elevator=de,
            rudder=0.0,
        )
        xdot = xdot_full(x, ctrl, params=params, limits=limits)

        # u_dot, w_dot, q_dot, gamma=theta-alpha (level flight)
        return np.array(
            [
                xdot[3],
                xdot[5],
                xdot[10],
                theta - alpha,
            ],
            dtype=float,
        )

    sol = least_squares(
        residual,
        x0=z0,
        bounds=(bounds_lo, bounds_hi),
        xtol=1e-9,
        ftol=1e-9,
        gtol=1e-9,
        max_nfev=400,
    )

    alpha, theta, de, throttle = [float(v) for v in sol.x]
    u = V * np.cos(alpha)
    w = V * np.sin(alpha)
    x0 = np.zeros(12, dtype=float)
    x0[3] = u
    x0[5] = w
    x0[7] = theta
    u0 = np.array([throttle, 0.0, de, 0.0], dtype=float)
    residual_norm = float(np.linalg.norm(sol.fun))

    if residual_norm > residual_tol:
        raise RuntimeError(
            f"Trim solver failed to converge below tolerance: "
            f"residual_norm={residual_norm:.3e}, tol={residual_tol:.1e}"
        )

    return TrimResult(
        x0=x0,
        u0=u0,
        alpha=alpha,
        theta=theta,
        throttle=throttle,
        elevator=de,
        residual_norm=residual_norm,
        success=bool(sol.success),
        nfev=int(sol.nfev),
    )


def compute_level_trim_guess(V_mps: float, params: AircraftParameters) -> TrimResult:
    """
    Backward-compatible entrypoint now returning nonlinear trim.
    """
    return compute_level_trim(V_mps, params)
