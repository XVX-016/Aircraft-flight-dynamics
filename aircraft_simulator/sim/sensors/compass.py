from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from sim.sensors.common import NoiseConfig, SampleConfig, ScalarSensorBase


def wrap_pi(a: float) -> float:
    return float((a + np.pi) % (2.0 * np.pi) - np.pi)


@dataclass
class Compass(ScalarSensorBase):
    """
    Outputs heading [rad] with wrap-around.
    """

    noise: NoiseConfig = field(default_factory=lambda: NoiseConfig(std=np.deg2rad(1.0), bias0=0.0, bias_rw_std=np.deg2rad(0.02)))
    sample: SampleConfig = field(default_factory=lambda: SampleConfig(rate_hz=10.0, delay_s=0.15))

    def read(self, t: float, true_value: float, dt: float) -> float:
        y = super().read(t, true_value, dt)
        return wrap_pi(y)


