from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, List


@dataclass(frozen=True)
class ScenarioEvent:
    """
    Generic time-based event.
    Users can map these to:
      - changes in AutopilotTargets
      - FailureManager mutations
      - wind changes
    """

    t_s: float
    name: str
    payload: dict


class ScenarioRunner:
    """
    Very lightweight scenario engine.

    Typical usage:
      runner = ScenarioRunner(events)
      ...
      runner.step(t, apply_fn)

    Where apply_fn is a callback taking (event: ScenarioEvent) which
    mutates the simulation runtime (e.g. set new target, inject failure).
    """

    def __init__(self, events: List[ScenarioEvent] | None = None):
        self.events: List[ScenarioEvent] = sorted(events or [], key=lambda e: e.t_s)
        self._idx = 0

    def reset(self) -> None:
        self._idx = 0

    def step(self, t: float, apply_fn: Callable[[ScenarioEvent], None]) -> None:
        while self._idx < len(self.events) and self.events[self._idx].t_s <= t:
            evt = self.events[self._idx]
            apply_fn(evt)
            self._idx += 1


