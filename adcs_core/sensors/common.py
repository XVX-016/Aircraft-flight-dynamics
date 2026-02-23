from __future__ import annotations

from dataclasses import dataclass, field
from typing import Deque, Generic, Optional, TypeVar

from collections import deque

import numpy as np

T = TypeVar("T")


@dataclass
class NoiseConfig:
    std: float = 0.0  # white noise std dev
    bias0: float = 0.0  # initial bias
    bias_rw_std: float = 0.0  # bias random-walk std per sqrt(s)


@dataclass
class SampleConfig:
    rate_hz: float = 50.0  # sensor update rate
    delay_s: float = 0.0  # output delay (transport delay)


class DelayLine(Generic[T]):
    def __init__(self, delay_s: float):
        self.delay_s = float(max(delay_s, 0.0))
        self._q: Deque[tuple[float, T]] = deque()

    def push(self, t: float, value: T) -> None:
        self._q.append((float(t), value))

    def pop_available(self, t: float) -> Optional[T]:
        """
        Returns the latest value whose timestamp <= t - delay_s.
        If nothing available, returns None.
        """
        target = float(t) - self.delay_s
        out = None
        while self._q and self._q[0][0] <= target:
            out = self._q.popleft()[1]
        return out


@dataclass
class ScalarSensorBase:
    noise: NoiseConfig = field(default_factory=NoiseConfig)
    sample: SampleConfig = field(default_factory=SampleConfig)
    seed: int | None = None

    _rng: np.random.Generator = field(init=False)
    _bias: float = field(init=False, default=0.0)
    _t_next: float = field(init=False, default=0.0)
    _delay: DelayLine[float] = field(init=False)
    _last_out: float = field(init=False, default=0.0)

    def __post_init__(self) -> None:
        self._rng = np.random.default_rng(self.seed)
        self._bias = float(self.noise.bias0)
        self._t_next = 0.0
        self._delay = DelayLine[float](self.sample.delay_s)

    def _update_bias(self, dt: float) -> None:
        if self.noise.bias_rw_std > 0.0 and dt > 0.0:
            self._bias += float(self._rng.normal(0.0, self.noise.bias_rw_std * np.sqrt(dt)))

    def _sample(self, true_value: float, dt: float) -> float:
        self._update_bias(dt)
        n = float(self._rng.normal(0.0, self.noise.std)) if self.noise.std > 0.0 else 0.0
        return float(true_value + self._bias + n)

    def read(self, t: float, true_value: float, dt: float) -> float:
        """
        Rate-limited sampling + delay line. Holds last output between updates.
        """
        if t + 1e-12 >= self._t_next:
            meas = self._sample(true_value, dt)
            self._delay.push(t, meas)
            self._t_next = t + (1.0 / max(self.sample.rate_hz, 1e-3))

        delayed = self._delay.pop_available(t)
        if delayed is not None:
            self._last_out = float(delayed)
        return self._last_out



