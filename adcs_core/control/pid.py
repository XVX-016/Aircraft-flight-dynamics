from __future__ import annotations

from dataclasses import dataclass

import numpy as np


def _clamp(x: float, lo: float, hi: float) -> float:
    return float(np.clip(x, lo, hi))


@dataclass
class PID:
    kp: float
    ki: float
    kd: float
    u_min: float = -np.inf
    u_max: float = np.inf

    integrator_limit: float = np.inf
    derivative_on_measurement: bool = True

    _integral: float = 0.0
    _prev_meas: float | None = None
    _prev_err: float | None = None

    def reset(self) -> None:
        self._integral = 0.0
        self._prev_meas = None
        self._prev_err = None

    def update(self, measurement: float, setpoint: float, dt: float) -> float:
        if dt <= 0.0:
            return _clamp(self.kp * (setpoint - measurement), self.u_min, self.u_max)

        err = setpoint - measurement

        # derivative term
        if self.derivative_on_measurement:
            if self._prev_meas is None:
                d = 0.0
            else:
                d = -(measurement - self._prev_meas) / dt
        else:
            if self._prev_err is None:
                d = 0.0
            else:
                d = (err - self._prev_err) / dt

        # tentative integral update
        integral_new = self._integral + err * dt
        integral_new = _clamp(integral_new, -self.integrator_limit, self.integrator_limit)

        u_unsat = self.kp * err + self.ki * integral_new + self.kd * d
        u = _clamp(u_unsat, self.u_min, self.u_max)

        # anti-windup: only accept integral if we didn't saturate (or if it would help)
        if np.isfinite(self.u_min) or np.isfinite(self.u_max):
            saturated = (u != u_unsat)
            if not saturated:
                self._integral = integral_new
            else:
                # if we're high-saturated and error is negative, allow integrator to unwind; similarly for low
                if (u >= self.u_max and err < 0.0) or (u <= self.u_min and err > 0.0):
                    self._integral = integral_new
        else:
            self._integral = integral_new

        self._prev_meas = measurement
        self._prev_err = err
        return u


