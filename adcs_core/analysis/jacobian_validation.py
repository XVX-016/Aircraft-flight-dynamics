from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from adcs_core.aircraft.aerodynamics import ControlInputs
from adcs_core.aircraft.forces_moments import ActuatorLimits
from adcs_core.aircraft.parameters import AircraftParameters
from adcs_core.dynamics.linearize import linearize
from adcs_core.model import xdot_full
from adcs_core.state.state_definition import ControlIndex


@dataclass(frozen=True)
class JacobianValidationResult:
    absolute_error: float
    relative_error: float
    epsilon: float
    direction: np.ndarray


def _xdot_from_vectors(
    x: np.ndarray,
    u_vec: np.ndarray,
    *,
    params: AircraftParameters,
    limits: ActuatorLimits,
) -> np.ndarray:
    ctrl = ControlInputs(
        throttle=float(u_vec[int(ControlIndex.THROTTLE)]),
        aileron=float(u_vec[int(ControlIndex.AILERON)]),
        elevator=float(u_vec[int(ControlIndex.ELEVATOR)]),
        rudder=float(u_vec[int(ControlIndex.RUDDER)]),
    )
    return xdot_full(np.asarray(x, dtype=float), ctrl, params=params, limits=limits)


def validate_jacobian(
    x_trim: np.ndarray,
    u_trim: np.ndarray,
    *,
    params: AircraftParameters,
    limits: ActuatorLimits,
    epsilon: float = 1e-6,
    seed: int = 0,
) -> JacobianValidationResult:
    """
    Validate local Jacobian via directional derivative check:
      (f(x + eps*v) - f(x))/eps  ~  A v
    """
    x0 = np.asarray(x_trim, dtype=float).reshape(-1)
    u0 = np.asarray(u_trim, dtype=float).reshape(-1)

    def f(x: np.ndarray, u_vec: np.ndarray) -> np.ndarray:
        return _xdot_from_vectors(x, u_vec, params=params, limits=limits)

    A, _B = linearize(f, x0, u0)

    rng = np.random.default_rng(seed)
    v = rng.standard_normal(x0.size)
    v /= np.linalg.norm(v)

    f0 = f(x0, u0)
    f1 = f(x0 + float(epsilon) * v, u0)
    fd = (f1 - f0) / float(epsilon)
    lin = A @ v

    abs_err = float(np.linalg.norm(fd - lin))
    denom = float(np.linalg.norm(fd))
    rel_err = abs_err / max(1e-12, denom)

    return JacobianValidationResult(
        absolute_error=abs_err,
        relative_error=rel_err,
        epsilon=float(epsilon),
        direction=v,
    )

