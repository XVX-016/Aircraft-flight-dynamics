import numpy as np

from sim.aircraft.aerodynamics import ControlInputs
from sim.control.linearize import linearize, select_subsystem
from sim.model import xdot_full
from sim.state import State


def test_linearize_shapes():
    s0 = State(u=35.0, v=0.0, w=0.0, phi=0.0, theta=0.0, psi=0.0)
    x0 = s0.as_vector()
    u0 = np.array([0.5, 0.0, 0.0, 0.0], dtype=float)

    def f(x, uvec):
        u = ControlInputs(throttle=float(uvec[0]), aileron=float(uvec[1]), elevator=float(uvec[2]), rudder=float(uvec[3]))
        return xdot_full(x, u)

    A, B = linearize(f, x0, u0)
    assert A.shape == (12, 12)
    assert B.shape == (12, 4)

    A_sub, B_sub = select_subsystem(A, B, state_idx=[3, 5, 10, 7], input_idx=[2, 0])
    assert A_sub.shape == (4, 4)
    assert B_sub.shape == (4, 2)


