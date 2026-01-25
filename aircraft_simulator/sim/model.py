from __future__ import annotations

import numpy as np

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.forces_moments import ActuatorLimits, forces_and_moments_body
from aircraft_simulator.sim.aircraft.parameters import AircraftParameters
from aircraft_simulator.sim.dynamics.equations import derivatives_6dof
from aircraft_simulator.sim.state import State


def xdot_full(
    x: np.ndarray,
    u: ControlInputs,
    *,
    params: AircraftParameters | None = None,
    limits: ActuatorLimits | None = None,
    uvw_air_mps: np.ndarray | None = None,
) -> np.ndarray:
    """
    Deterministic continuous-time dynamics for linearization/design tools.
    Wind should be handled by passing uvw_air_mps explicitly; otherwise uses state uvw.
    """
    params = params or AircraftParameters()
    limits = limits or ActuatorLimits()
    s = State.from_vector(x)
    uvw_air = np.array([s.u, s.v, s.w], dtype=float) if uvw_air_mps is None else np.asarray(uvw_air_mps, dtype=float).reshape(3)
    F, M, _ = forces_and_moments_body(s, u, params, limits, uvw_air_mps=uvw_air)
    return derivatives_6dof(0.0, x, params, F, M)


