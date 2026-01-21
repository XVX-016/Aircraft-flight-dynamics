from __future__ import annotations

from dataclasses import dataclass, field

from sim.sensors.common import NoiseConfig, SampleConfig, ScalarSensorBase


@dataclass
class Altimeter(ScalarSensorBase):
    """
    Outputs altitude [m].
    """

    noise: NoiseConfig = field(default_factory=lambda: NoiseConfig(std=0.8, bias0=0.0, bias_rw_std=0.02))
    sample: SampleConfig = field(default_factory=lambda: SampleConfig(rate_hz=20.0, delay_s=0.10))


