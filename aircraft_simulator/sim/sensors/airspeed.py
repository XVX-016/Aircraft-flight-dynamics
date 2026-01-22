from __future__ import annotations

from dataclasses import dataclass, field

from aircraft_simulator.sim.sensors.common import NoiseConfig, SampleConfig, ScalarSensorBase


@dataclass
class AirspeedSensor(ScalarSensorBase):
    """
    Outputs airspeed [m/s] (relative to air, not ground).
    """

    noise: NoiseConfig = field(default_factory=lambda: NoiseConfig(std=0.3, bias0=0.0, bias_rw_std=0.01))
    sample: SampleConfig = field(default_factory=lambda: SampleConfig(rate_hz=30.0, delay_s=0.05))



