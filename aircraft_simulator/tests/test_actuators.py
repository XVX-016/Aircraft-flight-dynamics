import numpy as np

from sim.aircraft.aerodynamics import ControlInputs
from sim.control.actuators import ActuatorState


def test_actuator_lag_moves_toward_command():
    act = ActuatorState(tau_s=1.0)
    act.reset(ControlInputs(throttle=0.0, elevator=0.0))
    u1 = act.update(ControlInputs(throttle=1.0, elevator=np.deg2rad(10.0)), dt=0.1)
    assert 0.0 < u1.throttle < 1.0


