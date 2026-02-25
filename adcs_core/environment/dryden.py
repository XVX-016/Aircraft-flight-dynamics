from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np


@dataclass
class FirstOrderShapingFilter:
    """
    Simple shaping filter used as a practical stand-in for Dryden components:
      x_dot = ( -x + sigma*w ) / tau
    where w ~ N(0,1).

    This is not a full spectral-match Dryden implementation, but it produces
    bandwidth-limited turbulence suitable for control stress testing.
    """

    sigma: float
    tau_s: float
    seed: int | None = None

    _rng: np.random.Generator = field(init=False)
    _x: float = field(init=False, default=0.0)

    def __post_init__(self) -> None:
        self._rng = np.random.default_rng(self.seed)

    def step(self, dt: float) -> float:
        if dt <= 0.0 or self.tau_s <= 0.0:
            return self._x
        a = float(np.clip(dt / self.tau_s, 0.0, 1.0))
        w = float(self._rng.normal(0.0, 1.0))
        self._x = (1.0 - a) * self._x + a * (self.sigma * w)
        return self._x


@dataclass
class DrydenLikeTurbulence:
    """
    Turbulence components in NED [m/s]:
      - u_gust (North), v_gust (East), w_gust (Down)

    Parameterization:
      sigma_*: intensity [m/s]
      tau_*: correlation time [s]
    """

    sigma_n: float = 1.0
    sigma_e: float = 1.0
    sigma_d: float = 0.7
    tau_n_s: float = 3.0
    tau_e_s: float = 3.0
    tau_d_s: float = 2.0
    seed: int | None = None

    _fn: FirstOrderShapingFilter = field(init=False)
    _fe: FirstOrderShapingFilter = field(init=False)
    _fd: FirstOrderShapingFilter = field(init=False)

    def __post_init__(self) -> None:
        base = 0 if self.seed is None else int(self.seed)
        self._fn = FirstOrderShapingFilter(self.sigma_n, self.tau_n_s, seed=None if self.seed is None else base + 10)
        self._fe = FirstOrderShapingFilter(self.sigma_e, self.tau_e_s, seed=None if self.seed is None else base + 11)
        self._fd = FirstOrderShapingFilter(self.sigma_d, self.tau_d_s, seed=None if self.seed is None else base + 12)

    def step(self, dt: float) -> np.ndarray:
        return np.array([self._fn.step(dt), self._fe.step(dt), self._fd.step(dt)], dtype=float)



