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


@dataclass
class DrydenTurbulence:
    """
    MIL-HDBK-1797 Dryden Atmospheric Turbulence Model.
    Generates (ug, vg, wg) in aircraft body frame.

    The model depends on:
      - altitude (h)
      - airspeed (V)
    """

    intensity: float = 0.1  # 0 to 1 scaling
    seed: int | None = None

    _rng: np.random.Generator = field(init=False)
    _states: np.ndarray = field(init=False, default_factory=lambda: np.zeros(3))
    last_output: np.ndarray = field(init=False, default_factory=lambda: np.zeros(3))

    def __post_init__(self) -> None:
        self._rng = np.random.default_rng(self.seed)
        self._states = np.zeros(3, dtype=float)
        self.last_output = np.zeros(3, dtype=float)

    def step(self, dt: float, h_m: float, V_mps: float) -> np.ndarray:
        """
        Advance turbulence state. Returns (ug, vg, wg) in [m/s].
        """
        if dt <= 0.0 or V_mps < 1.0 or self.intensity <= 0.0:
            self.last_output = np.zeros(3)
            return self.last_output

        # 1. Coordinate & Unit Conversion
        # MIL-HDBK-1797 formulas use feet.
        h_ft = max(h_m * 3.28084, 10.0)
        V_fps = V_mps * 3.28084

        # 2. Parameters (Low Altitude Model h < 1000 ft)
        # Intensity scaling: map 0-1 to 0-30 knots (W20)
        W20_fps = self.intensity * 30.0 * 1.68781  # 30 knots in fps

        # Vertical intensity
        sigma_w = 0.1 * W20_fps
        # Vertical scale length
        L_w = h_ft

        # Lateral/Longitudinal scale lengths
        L_u = h_ft / (0.177 + 0.000823 * h_ft) ** 1.2
        L_v = L_u

        # Lateral/Longitudinal intensities
        sigma_u = sigma_w / (0.177 + 0.000823 * h_ft) ** 0.4
        sigma_v = sigma_u

        # 3. Discrete Filtering
        # General form: x_{k+1} = a*x_k + sigma*sqrt(1 - a^2)*w_k
        # tau = L / V
        # a = exp(-dt/tau) = exp(-dt * V / L)

        scales = np.array([L_u, L_v, L_w])
        sigmas = np.array([sigma_u, sigma_v, sigma_w])

        for i in range(3):
            tau = scales[i] / V_fps
            a = float(np.exp(-dt / tau))
            w = float(self._rng.normal(0.0, 1.0))
            self._states[i] = a * self._states[i] + sigmas[i] * np.sqrt(1.0 - a**2) * w

        # Convert back to m/s
        self.last_output = self._states / 3.28084
        return self.last_output
