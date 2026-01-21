from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import numpy as np

from sim.aircraft.aerodynamics import ControlInputs, compute_aero_forces_moments_body_from_air_vel
from sim.aircraft.parameters import AircraftParameters
from sim.state import State


@dataclass(frozen=True)
class ActuatorLimits:
    elevator_max_rad: float = np.deg2rad(25.0)
    aileron_max_rad: float = np.deg2rad(20.0)
    rudder_max_rad: float = np.deg2rad(30.0)


def clamp_controls(u: ControlInputs, lim: ActuatorLimits) -> ControlInputs:
    return ControlInputs(
        throttle=float(np.clip(u.throttle, 0.0, 1.0)),
        aileron=float(np.clip(u.aileron, -lim.aileron_max_rad, lim.aileron_max_rad)),
        elevator=float(np.clip(u.elevator, -lim.elevator_max_rad, lim.elevator_max_rad)),
        rudder=float(np.clip(u.rudder, -lim.rudder_max_rad, lim.rudder_max_rad)),
    )


def thrust_force_body(u: ControlInputs, params: AircraftParameters) -> np.ndarray:
    # Phase 2: simple prop model = commanded thrust along +x body
    T = params.max_thrust_N * float(np.clip(u.throttle, 0.0, 1.0))
    return np.array([T, 0.0, 0.0], dtype=float)


def forces_and_moments_body(
    state: State,
    controls: ControlInputs,
    params: AircraftParameters,
    limits: ActuatorLimits,
    *,
    uvw_air_mps: np.ndarray | None = None,
) -> Tuple[np.ndarray, np.ndarray, dict]:
    """
    Net forces/moments in body axes.
    """
    u = clamp_controls(controls, limits)

    uvw_air = np.array([state.u, state.v, state.w], dtype=float) if uvw_air_mps is None else np.asarray(uvw_air_mps, dtype=float).reshape(3)
    pqr = np.array([state.p, state.q, state.r], dtype=float)
    F_aero, M_aero, debug = compute_aero_forces_moments_body_from_air_vel(
        uvw_air_mps=uvw_air, pqr_radps=pqr, controls=u, params=params
    )
    F_thrust = thrust_force_body(u, params)

    F = F_aero + F_thrust
    M = M_aero

    debug = dict(debug)
    debug.update(
        {
            "throttle": u.throttle,
            "aileron": u.aileron,
            "elevator": u.elevator,
            "rudder": u.rudder,
            "Fx_aero": float(F_aero[0]),
            "Fy_aero": float(F_aero[1]),
            "Fz_aero": float(F_aero[2]),
            "Fx_thrust": float(F_thrust[0]),
            "Fx_total": float(F[0]),
            "Fy_total": float(F[1]),
            "Fz_total": float(F[2]),
            "L_total": float(M[0]),
            "M_total": float(M[1]),
            "N_total": float(M[2]),
        }
    )

    return F, M, debug


