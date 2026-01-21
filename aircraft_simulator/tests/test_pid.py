from sim.control.pid import PID


def test_pid_saturates_and_does_not_runaway_integral():
    pid = PID(kp=0.0, ki=10.0, kd=0.0, u_min=-1.0, u_max=1.0, integrator_limit=0.2)
    u = 0.0
    for _ in range(200):
        u = pid.update(measurement=0.0, setpoint=10.0, dt=0.01)
    assert -1.0 <= u <= 1.0


