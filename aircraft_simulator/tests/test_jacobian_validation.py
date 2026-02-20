from __future__ import annotations

import pytest

from aircraft_simulator.sim.aircraft.database import get_aircraft_model
from aircraft_simulator.sim.analysis.jacobian_validation import validate_jacobian
from aircraft_simulator.sim.analysis.trim import compute_level_trim


@pytest.mark.parametrize(
    ("aircraft_id", "speed_mps"),
    [
        ("cessna_172r", 60.0),
        ("f16_research", 150.0),
    ],
)
def test_jacobian_directional_consistency(aircraft_id: str, speed_mps: float) -> None:
    model = get_aircraft_model(aircraft_id)
    trim = compute_level_trim(speed_mps, model.params, limits=model.limits)

    result = validate_jacobian(
        trim.x0,
        trim.u0,
        params=model.params,
        limits=model.limits,
        epsilon=1e-6,
        seed=7,
    )

    assert result.relative_error < 1e-3
