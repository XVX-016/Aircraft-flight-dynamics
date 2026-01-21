from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from sim.aircraft.aerodynamics import ControlInputs
from sim.aircraft.forces_moments import ActuatorLimits, clamp_controls


@dataclass
class ActuatorState:
    """
    First-order actuator lag on each channel:
      x_dot = (x_cmd - x) / tau
    """

    tau_s: float = 0.15
    limits: ActuatorLimits = ActuatorLimits()

    _u: ControlInputs = ControlInputs()

    def reset(self, u0: ControlInputs | None = None) -> None:
        self._u = clamp_controls(u0 or ControlInputs(), self.limits)

    @property
    def u(self) -> ControlInputs:
        return self._u

    def update(self, u_cmd: ControlInputs, dt: float) -> ControlInputs:
        u_cmd = clamp_controls(u_cmd, self.limits)
        if dt <= 0.0 or self.tau_s <= 0.0:
            self._u = u_cmd
            return self._u

        a = float(np.clip(dt / self.tau_s, 0.0, 1.0))
        self._u = ControlInputs(
            throttle=float(self._u.throttle + a * (u_cmd.throttle - self._u.throttle)),
            aileron=float(self._u.aileron + a * (u_cmd.aileron - self._u.aileron)),
            elevator=float(self._u.elevator + a * (u_cmd.elevator - self._u.elevator)),
            rudder=float(self._u.rudder + a * (u_cmd.rudder - self._u.rudder)),
        )
        self._u = clamp_controls(self._u, self.limits)
        return self._u


