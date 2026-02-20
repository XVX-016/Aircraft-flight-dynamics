from __future__ import annotations

import numpy as np

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.database import get_aircraft_model
from aircraft_simulator.sim.analysis.modal_analysis import analyze_modal_structure
from aircraft_simulator.sim.analysis.trim import compute_level_trim
from aircraft_simulator.sim.control.linearize import linearize
from aircraft_simulator.sim.model import xdot_full


def _linearize_at_trim(aircraft_id: str, speed_mps: float) -> np.ndarray:
    model = get_aircraft_model(aircraft_id)
    trim = compute_level_trim(speed_mps, model.params, limits=model.limits)

    def f(x: np.ndarray, u_vec: np.ndarray) -> np.ndarray:
        ctrl = ControlInputs(
            throttle=float(u_vec[0]),
            aileron=float(u_vec[1]),
            elevator=float(u_vec[2]),
            rudder=float(u_vec[3]),
        )
        return xdot_full(x, ctrl, params=model.params, limits=model.limits)

    A, _B = linearize(f, trim.x0, trim.u0)
    return A


def test_modal_metrics_cessna_trimmed_case() -> None:
    A = _linearize_at_trim("cessna_172r", 60.0)
    result = analyze_modal_structure(A)

    assert result.unstable_modes == 0
    assert result.spectral_margin >= -1e-8
    assert result.min_damping_ratio is not None
    assert len(result.modes) > 0


def test_modal_metrics_f16_trimmed_case_detects_instability() -> None:
    A = _linearize_at_trim("f16_research", 150.0)
    result = analyze_modal_structure(A)

    assert result.unstable_modes >= 1
    assert result.spectral_margin < 0.0
    assert result.min_damping_ratio is not None
    assert len(result.modes) > 0
