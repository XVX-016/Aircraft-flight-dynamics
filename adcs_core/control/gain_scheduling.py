from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Tuple

import numpy as np


@dataclass
class GainSchedule1D:
    """
    Simple 1-D gain schedule with linear interpolation.

    Example: schedule altitude PID gains vs airspeed:
      schedule = GainSchedule1D(
          breakpoints=[25.0, 35.0, 45.0],
          gains=[(kp1, ki1, kd1), (kp2, ki2, kd2), (kp3, ki3, kd3)],
      )
      kp, ki, kd = schedule(airspeed)
    """

    breakpoints: Iterable[float]
    gains: Iterable[Tuple[float, ...]]

    def __post_init__(self) -> None:
        self.breakpoints = np.asarray(list(self.breakpoints), dtype=float).reshape(-1)
        self.gains = np.asarray(list(self.gains), dtype=float)
        if self.breakpoints.size != self.gains.shape[0]:
            raise ValueError("breakpoints and gains length mismatch")

    def __call__(self, x: float) -> np.ndarray:
        x = float(x)
        if self.breakpoints.size == 1:
            return self.gains[0]
        return np.array(
            [np.interp(x, self.breakpoints, self.gains[:, i]) for i in range(self.gains.shape[1])],
            dtype=float,
        )


@dataclass
class ScheduledPIDGains:
    """
    Convenience wrapper: provides (kp, ki, kd) from a GainSchedule1D.
    """

    schedule: GainSchedule1D

    def gains(self, x: float) -> Tuple[float, float, float]:
        g = self.schedule(x)
        if g.size != 3:
            raise ValueError("Expected 3-tuple gains (kp, ki, kd)")
        return float(g[0]), float(g[1]), float(g[2])


