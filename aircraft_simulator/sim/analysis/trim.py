from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.parameters import AircraftParameters, qbar
from aircraft_simulator.sim.model import xdot_full


@dataclass(frozen=True)
class TrimResult:
    x0: np.ndarray
    u0: np.ndarray
    alpha: float
    throttle: float
    elevator: float
    residual_norm: float


def compute_level_trim_guess(V_mps: float, params: AircraftParameters) -> TrimResult:
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
        throttle=throttle,
        elevator=de,
        residual_norm=residual_norm,
    )
