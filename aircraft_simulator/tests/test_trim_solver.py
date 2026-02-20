from __future__ import annotations

import numpy as np
import pytest

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.database import get_aircraft_model
from aircraft_simulator.sim.analysis.trim import compute_level_trim
from aircraft_simulator.sim.model import xdot_full


@pytest.mark.parametrize(
    ("aircraft_id", "speed_mps"),
    [
        ("cessna_172r", 60.0),
        ("f16_research", 150.0),
    ],
)
def test_nonlinear_trim_converges_with_small_residual(aircraft_id: str, speed_mps: float) -> None:
    model = get_aircraft_model(aircraft_id)
    trim = compute_level_trim(speed_mps, model.params, limits=model.limits)

    assert trim.success
    assert trim.residual_norm < 1e-6
    assert abs(trim.theta - trim.alpha) < 1e-8


@pytest.mark.parametrize(
    ("aircraft_id", "speed_mps"),
    [
        ("cessna_172r", 60.0),
        ("f16_research", 150.0),
    ],
)
def test_trim_state_is_dynamic_equilibrium(aircraft_id: str, speed_mps: float) -> None:
    model = get_aircraft_model(aircraft_id)
    trim = compute_level_trim(speed_mps, model.params, limits=model.limits)
    controls = ControlInputs(
        throttle=float(trim.u0[0]),
        aileron=0.0,
        elevator=float(trim.u0[2]),
        rudder=0.0,
    )

    xdot = xdot_full(trim.x0, controls, params=model.params, limits=model.limits)
    dyn_residual = np.linalg.norm(xdot[3:12])
    assert dyn_residual < 1e-6
