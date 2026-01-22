from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

import numpy as np

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs


@dataclass
class ActuatorFailures:
    elevator_stuck_rad: Optional[float] = None  # if set, elevator is forced to this value
    aileron_stuck_rad: Optional[float] = None
    rudder_stuck_rad: Optional[float] = None
    throttle_stuck: Optional[float] = None  # 0..1

    throttle_scale: float = 1.0  # reduce available thrust (0..1)


@dataclass
class SensorFailures:
    # per-signal failure controls
    dropout: Dict[str, bool] | None = None  # if True: output NaN
    freeze: Dict[str, bool] | None = None  # if True: hold last good value
    bias_spike: Dict[str, float] | None = None  # added to measurement (one-time persistent until cleared)


class FailureManager:
    def __init__(self):
        self.act = ActuatorFailures()
        self.sens = SensorFailures(dropout={}, freeze={}, bias_spike={})
        self._frozen_cache: Dict[str, float] = {}
        self._schedule: list[tuple[float, callable]] = []
        self._schedule_idx: int = 0

    def schedule(self, t_s: float, fn: callable) -> None:
        """
        Schedule a callable to run at simulation time t_s.
        The callable should mutate self.act / self.sens as desired.
        """
        self._schedule.append((float(t_s), fn))
        self._schedule.sort(key=lambda x: x[0])

    def step(self, t: float) -> None:
        """
        Execute any scheduled events whose time has arrived.
        """
        while self._schedule_idx < len(self._schedule) and self._schedule[self._schedule_idx][0] <= t:
            _, fn = self._schedule[self._schedule_idx]
            fn()
            self._schedule_idx += 1

    def apply_actuator(self, u_cmd: ControlInputs) -> ControlInputs:
        u = u_cmd

        # scale throttle first
        throttle = float(np.clip(u.throttle * float(self.act.throttle_scale), 0.0, 1.0))

        if self.act.throttle_stuck is not None:
            throttle = float(np.clip(self.act.throttle_stuck, 0.0, 1.0))

        aileron = u.aileron if self.act.aileron_stuck_rad is None else float(self.act.aileron_stuck_rad)
        elevator = u.elevator if self.act.elevator_stuck_rad is None else float(self.act.elevator_stuck_rad)
        rudder = u.rudder if self.act.rudder_stuck_rad is None else float(self.act.rudder_stuck_rad)

        return ControlInputs(throttle=throttle, aileron=float(aileron), elevator=float(elevator), rudder=float(rudder))

    def apply_sensors(self, meas: Dict[str, float]) -> Dict[str, float]:
        out = dict(meas)

        # bias spikes
        for k, b in (self.sens.bias_spike or {}).items():
            if k in out and np.isfinite(out[k]):
                out[k] = float(out[k] + b)

        # dropout/freeze
        for k, v in out.items():
            if (self.sens.dropout or {}).get(k, False):
                out[k] = float("nan")
                continue

            if (self.sens.freeze or {}).get(k, False):
                if k in self._frozen_cache:
                    out[k] = float(self._frozen_cache[k])
                else:
                    # first time freezing: latch current
                    if np.isfinite(v):
                        self._frozen_cache[k] = float(v)
                        out[k] = float(v)
                    else:
                        out[k] = float("nan")
            else:
                # update cache with current good value
                if np.isfinite(v):
                    self._frozen_cache[k] = float(v)

        return out


