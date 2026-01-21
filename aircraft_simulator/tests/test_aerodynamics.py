import numpy as np

from sim.aircraft.aerodynamics import ControlInputs, compute_aero_forces_moments_body
from sim.aircraft.parameters import AircraftParameters
from sim.state import State


def test_lift_increases_with_positive_alpha():
    params = AircraftParameters()
    u = ControlInputs(throttle=0.0, elevator=0.0, aileron=0.0, rudder=0.0)

    s0 = State(u=40.0, v=0.0, w=0.0)
    F0, _, d0 = compute_aero_forces_moments_body(s0, u, params)

    # positive alpha -> w positive (down) in our convention
    s1 = State(u=40.0, v=0.0, w=4.0)
    F1, _, d1 = compute_aero_forces_moments_body(s1, u, params)

    # Lift is up => negative Z_wind, so in body axes we should see more negative Fz as alpha increases
    assert d1["alpha"] > d0["alpha"]
    assert F1[2] < F0[2]


def test_drag_opposes_forward_motion_at_zero_alpha():
    params = AircraftParameters()
    u = ControlInputs()
    s = State(u=30.0, v=0.0, w=0.0)
    F, _, d = compute_aero_forces_moments_body(s, u, params)

    # at alpha=0, wind ~= body, drag should oppose motion => Fx negative
    assert abs(d["alpha"]) < 1e-6
    assert F[0] < 0.0


