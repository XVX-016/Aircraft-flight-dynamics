from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from aircraft_simulator.sim.environment.dryden import DrydenLikeTurbulence


@dataclass
class WindModel:
    """
    Wind in inertial NED frame [m/s].
    Phase 3: steady + gust (white) + simple 1st-order filtered turbulence.
    """

    steady_ned_mps: np.ndarray = field(default_factory=lambda: np.zeros(3))
    gust_std_mps: float = 0.5
    turb_std_mps: float = 0.8
    turb_tau_s: float = 3.0
    use_dryden_like: bool = True
    seed: int | None = None

    _rng: np.random.Generator = field(init=False)
    _turb: np.ndarray = field(init=False, default_factory=lambda: np.zeros(3))
    _dryden: DrydenLikeTurbulence | None = field(init=False, default=None)

    def __post_init__(self) -> None:
        self._rng = np.random.default_rng(self.seed)
        self.steady_ned_mps = np.asarray(self.steady_ned_mps, dtype=float).reshape(3)
        self._turb = np.zeros(3, dtype=float)
        if self.use_dryden_like:
            self._dryden = DrydenLikeTurbulence(
                sigma_n=self.turb_std_mps,
                sigma_e=self.turb_std_mps,
                sigma_d=0.7 * self.turb_std_mps,
                tau_n_s=self.turb_tau_s,
                tau_e_s=self.turb_tau_s,
                tau_d_s=max(0.5 * self.turb_tau_s, 0.5),
                seed=self.seed,
            )

    def step(self, dt: float) -> np.ndarray:
        if self.use_dryden_like and self._dryden is not None:
            self._turb = self._dryden.step(dt)
        else:
            # fallback turbulence: Ornstein-Uhlenbeck-like (first-order) process
            if dt > 0.0 and self.turb_tau_s > 0.0 and self.turb_std_mps > 0.0:
                a = float(np.clip(dt / self.turb_tau_s, 0.0, 1.0))
                w = self._rng.normal(0.0, self.turb_std_mps, size=3)
                self._turb = (1.0 - a) * self._turb + a * w
            else:
                self._turb = np.zeros(3)

        gust = self._rng.normal(0.0, self.gust_std_mps, size=3) if self.gust_std_mps > 0.0 else np.zeros(3)
        return self.steady_ned_mps + self._turb + gust


