from __future__ import annotations

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.database import get_aircraft_model
from aircraft_simulator.sim.analysis.lqr_longitudinal import (
    compare_open_closed_longitudinal_response,
    design_longitudinal_lqr,
)
from aircraft_simulator.sim.analysis.trim import compute_level_trim
from aircraft_simulator.sim.control.linearize import linearize
from aircraft_simulator.sim.model import xdot_full


def test_f16_longitudinal_lqr_stabilizes_linear_subsystem() -> None:
    model = get_aircraft_model("f16_research")
    trim = compute_level_trim(150.0, model.params, limits=model.limits)

    def f(x, u_vec):
        ctrl = ControlInputs(
            throttle=float(u_vec[0]),
            aileron=float(u_vec[1]),
            elevator=float(u_vec[2]),
            rudder=float(u_vec[3]),
        )
        return xdot_full(x, ctrl, params=model.params, limits=model.limits)

    A, B = linearize(f, trim.x0, trim.u0)
    design = design_longitudinal_lqr(A, B)

    assert design.controllability_rank == 4
    assert design.max_real_open > 0.0
    assert design.max_real_closed < 0.0


def test_f16_open_vs_closed_nonlinear_response() -> None:
    model = get_aircraft_model("f16_research")
    trim = compute_level_trim(150.0, model.params, limits=model.limits)

    def f(x, u_vec):
        ctrl = ControlInputs(
            throttle=float(u_vec[0]),
            aileron=float(u_vec[1]),
            elevator=float(u_vec[2]),
            rudder=float(u_vec[3]),
        )
        return xdot_full(x, ctrl, params=model.params, limits=model.limits)

    A, B = linearize(f, trim.x0, trim.u0)
    design = design_longitudinal_lqr(A, B)
    comparison = compare_open_closed_longitudinal_response(
        params=model.params,
        limits=model.limits,
        trim=trim,
        K=design.K,
        tfinal_s=5.0,
        dt_s=0.01,
        alpha_perturb_deg=0.5,
    )

    assert comparison.open_loop.final_longitudinal_error_norm > comparison.closed_loop.final_longitudinal_error_norm
