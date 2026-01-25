import math

import numpy as np

from sim.control.failure_modes import FailureManager
from sim.sensors.altimeter import Altimeter
from sim.sensors.common import SampleConfig


def test_altimeter_delay_holds_previous_value():
    alt = Altimeter(seed=123, sample=SampleConfig(rate_hz=10.0, delay_s=0.2))

    # At t=0, no delayed sample yet -> default last_out (initialized to 0.0)
    y0 = alt.read(0.0, true_value=1000.0, dt=0.01)
    assert isinstance(y0, float)

    # Push some time forward but less than delay; still should not reflect 1000 immediately
    y1 = alt.read(0.1, true_value=1000.0, dt=0.1)
    assert abs(y1 - y0) < 1e-6

    # Past delay, should update toward measurement (not necessarily equal due to noise)
    y2 = alt.read(0.25, true_value=1000.0, dt=0.15)
    assert y2 != y0


def test_failure_freeze_and_dropout():
    fm = FailureManager()
    meas = {"a": 1.0, "b": 2.0}

    fm.sens.freeze["a"] = True
    m1 = fm.apply_sensors(meas)
    assert m1["a"] == 1.0

    meas2 = {"a": 10.0, "b": 2.0}
    m2 = fm.apply_sensors(meas2)
    # frozen stays at first latched value
    assert m2["a"] == 1.0

    fm.sens.dropout["b"] = True
    m3 = fm.apply_sensors(meas2)
    assert math.isnan(m3["b"])


