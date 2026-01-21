from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from sim.sensors.common import DelayLine, NoiseConfig, SampleConfig


@dataclass
class IMU:
    """
    IMU outputs:
      - gyro: p,q,r [rad/s]
      - accel: ax,ay,az [m/s^2]

    Phase 3: we model (i) white noise, (ii) bias + bias random-walk, (iii) sample rate + delay.
    Accel is computed from "specific force" approximation in body axes:
      f_b ≈ a_b - g_b
    We compute a_b from finite difference of body velocity plus omega x v.
    """

    gyro_noise: NoiseConfig = field(default_factory=lambda: NoiseConfig(std=0.002, bias0=0.0, bias_rw_std=0.0003))
    accel_noise: NoiseConfig = field(default_factory=lambda: NoiseConfig(std=0.05, bias0=0.0, bias_rw_std=0.01))
    sample: SampleConfig = field(default_factory=lambda: SampleConfig(rate_hz=100.0, delay_s=0.02))
    seed: int | None = None

    _rng: np.random.Generator = field(init=False)
    _t_next: float = field(init=False, default=0.0)
    _gyro_bias: np.ndarray = field(init=False)
    _accel_bias: np.ndarray = field(init=False)
    _delay: DelayLine[dict] = field(init=False)
    _last_out: dict = field(init=False, default_factory=dict)

    _prev_vb: np.ndarray = field(init=False, default_factory=lambda: np.zeros(3))
    _prev_omega: np.ndarray = field(init=False, default_factory=lambda: np.zeros(3))

    def __post_init__(self) -> None:
        self._rng = np.random.default_rng(self.seed)
        self._t_next = 0.0
        self._gyro_bias = np.full(3, float(self.gyro_noise.bias0), dtype=float)
        self._accel_bias = np.full(3, float(self.accel_noise.bias0), dtype=float)
        self._delay = DelayLine[dict](self.sample.delay_s)

    def _bias_rw(self, bias: np.ndarray, cfg: NoiseConfig, dt: float) -> np.ndarray:
        if cfg.bias_rw_std > 0.0 and dt > 0.0:
            return bias + self._rng.normal(0.0, cfg.bias_rw_std * np.sqrt(dt), size=3)
        return bias

    def read(
        self,
        t: float,
        *,
        pqr_radps: np.ndarray,
        uvw_mps: np.ndarray,
        g_b_ms2: np.ndarray,
        dt: float,
    ) -> dict:
        """
        Provide current body rates pqr and body velocities uvw, plus gravity expressed in body axes g_b.
        """
        if t + 1e-12 >= self._t_next:
            omega = np.asarray(pqr_radps, dtype=float).reshape(3)
            v_b = np.asarray(uvw_mps, dtype=float).reshape(3)

            if dt > 0.0:
                v_dot = (v_b - self._prev_vb) / dt
            else:
                v_dot = np.zeros(3)

            # body acceleration a_b = v_dot + omega x v
            a_b = v_dot + np.cross(omega, v_b)
            specific_force = a_b - np.asarray(g_b_ms2, dtype=float).reshape(3)

            self._gyro_bias = self._bias_rw(self._gyro_bias, self.gyro_noise, dt)
            self._accel_bias = self._bias_rw(self._accel_bias, self.accel_noise, dt)

            gyro_meas = omega + self._gyro_bias
            accel_meas = specific_force + self._accel_bias

            if self.gyro_noise.std > 0.0:
                gyro_meas = gyro_meas + self._rng.normal(0.0, self.gyro_noise.std, size=3)
            if self.accel_noise.std > 0.0:
                accel_meas = accel_meas + self._rng.normal(0.0, self.accel_noise.std, size=3)

            out = {
                "p_radps": float(gyro_meas[0]),
                "q_radps": float(gyro_meas[1]),
                "r_radps": float(gyro_meas[2]),
                "ax_ms2": float(accel_meas[0]),
                "ay_ms2": float(accel_meas[1]),
                "az_ms2": float(accel_meas[2]),
            }
            self._delay.push(t, out)
            self._t_next = t + (1.0 / max(self.sample.rate_hz, 1e-3))

            self._prev_vb = v_b
            self._prev_omega = omega

        delayed = self._delay.pop_available(t)
        if delayed is not None:
            self._last_out = delayed

        # ensure keys exist
        if not self._last_out:
            self._last_out = {
                "p_radps": float(pqr_radps[0]),
                "q_radps": float(pqr_radps[1]),
                "r_radps": float(pqr_radps[2]),
                "ax_ms2": 0.0,
                "ay_ms2": 0.0,
                "az_ms2": 0.0,
            }
        return dict(self._last_out)



