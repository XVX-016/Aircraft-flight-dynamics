from __future__ import annotations

import numpy as np
import pytest

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.database import get_aircraft_model
from aircraft_simulator.sim.analysis.modal_fidelity import (
    estimate_unstable_growth_rate,
    select_longitudinal_complex_mode,
    validate_modal_fidelity,
)
from aircraft_simulator.sim.analysis.trim import compute_level_trim
from aircraft_simulator.sim.control.linearize import linearize
from aircraft_simulator.sim.model import xdot_full


def _linearize_at_trim(aircraft_id: str, speed_mps: float):
    model = get_aircraft_model(aircraft_id)
    trim = compute_level_trim(speed_mps, model.params, limits=model.limits)

    def f(x, u_vec):
        ctrl = ControlInputs(
            throttle=float(u_vec[0]),
            aileron=float(u_vec[1]),
            elevator=float(u_vec[2]),
            rudder=float(u_vec[3]),
        )
        return xdot_full(x, ctrl, params=model.params, limits=model.limits)

    A, B = linearize(f, trim.x0, trim.u0)
    A_lon = A[np.ix_([3, 5, 10, 7], [3, 5, 10, 7])]
    return model, trim, A_lon, B


def test_cessna_short_period_modal_fidelity() -> None:
    model, trim, A_lon, _B = _linearize_at_trim("cessna_172r", 60.0)
    ev = select_longitudinal_complex_mode(A_lon, preference="short_period")
    result = validate_modal_fidelity(
        params=model.params,
        limits=model.limits,
        trim=trim,
        eigenvalue=ev,
        K=None,
        tfinal_s=10.0,
        dt_s=0.01,
        alpha_perturb_deg=0.5,
        signal="q",
    )

    assert result.omega_error_percent < 5.0
    assert result.zeta_error_percent < 10.0
    assert result.sigma_error_percent < 10.0


def test_f16_open_loop_has_no_observable_longitudinal_oscillation_in_short_horizon() -> None:
    model, trim, A_lon, _B = _linearize_at_trim("f16_research", 150.0)
    ev = select_longitudinal_complex_mode(A_lon, preference="short_period")
    with pytest.raises(RuntimeError, match="Insufficient peaks"):
        validate_modal_fidelity(
            params=model.params,
            limits=model.limits,
            trim=trim,
            eigenvalue=ev,
            K=None,
            tfinal_s=10.0,
            dt_s=0.01,
            alpha_perturb_deg=0.5,
            signal="q",
        )


def test_f16_unstable_real_mode_growth_rate_matches_linear_sign_and_order() -> None:
    model, trim, A_lon, _B = _linearize_at_trim("f16_research", 150.0)
    sigma_linear = float(np.max(np.real(np.linalg.eigvals(A_lon))))
    est = estimate_unstable_growth_rate(
        params=model.params,
        limits=model.limits,
        trim=trim,
        sigma_linear=sigma_linear,
        tfinal_s=3.0,
        dt_s=0.01,
        alpha_perturb_deg=0.5,
        fit_window_s=(0.4, 2.0),
    )

    assert sigma_linear > 0.0
    assert est.sigma_nonlinear > 0.0
    assert est.sigma_error_percent < 35.0
