from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional

import numpy as np


@dataclass(frozen=True)
class StepMetrics:
    y0: float
    y_final: float
    step_amplitude: float
    peak: float
    peak_time_s: float
    overshoot_frac: float
    rise_time_s: Optional[float]
    settling_time_s: Optional[float]


def _first_time_crossing(t: np.ndarray, y: np.ndarray, level: float) -> Optional[float]:
    idx = np.where(y >= level)[0]
    if idx.size == 0:
        return None
    return float(t[int(idx[0])])


def step_response_metrics(
    t: Iterable[float],
    y: Iterable[float],
    *,
    y_target: float,
    settle_band_frac: float = 0.02,
    rise_lo_frac: float = 0.1,
    rise_hi_frac: float = 0.9,
) -> StepMetrics:
    """
    Compute standard step response metrics for a response y(t) approaching y_target.

    - overshoot_frac is relative to step amplitude (positive step assumed; for negative steps, uses absolute amplitude)
    - rise_time is time from 10% to 90% of step
    - settling_time is first time after which y stays within ±settle_band of target
    """
    t = np.asarray(list(t), dtype=float)
    y = np.asarray(list(y), dtype=float)
    if t.size != y.size or t.size < 2:
        raise ValueError("t and y must have same length >= 2")

    y0 = float(y[0])
    y_final = float(y[-1])
    amp = float(y_target - y0)
    amp_abs = max(abs(amp), 1e-9)

    peak_idx = int(np.argmax(y)) if amp >= 0 else int(np.argmin(y))
    peak = float(y[peak_idx])
    peak_t = float(t[peak_idx])

    overshoot = (peak - y_target) / amp_abs if amp >= 0 else (y_target - peak) / amp_abs
    overshoot = float(max(0.0, overshoot))

    y_lo = y0 + rise_lo_frac * amp
    y_hi = y0 + rise_hi_frac * amp
    if amp < 0:
        # invert for negative step
        y_lo, y_hi = y0 + rise_lo_frac * amp, y0 + rise_hi_frac * amp
        # crossing should be <= for negative step
        def cross_time(level: float) -> Optional[float]:
            idx = np.where(y <= level)[0]
            if idx.size == 0:
                return None
            return float(t[int(idx[0])])

        t_lo = cross_time(y_lo)
        t_hi = cross_time(y_hi)
    else:
        t_lo = _first_time_crossing(t, y, y_lo)
        t_hi = _first_time_crossing(t, y, y_hi)

    rise_time = None if (t_lo is None or t_hi is None) else float(max(0.0, t_hi - t_lo))

    band = settle_band_frac * amp_abs
    within = np.abs(y - y_target) <= band
    settling_time = None
    # find first index after which all remaining are within band
    for i in range(within.size):
        if bool(within[i]) and bool(np.all(within[i:])):
            settling_time = float(t[i])
            break

    return StepMetrics(
        y0=y0,
        y_final=y_final,
        step_amplitude=float(amp),
        peak=peak,
        peak_time_s=peak_t,
        overshoot_frac=overshoot,
        rise_time_s=rise_time,
        settling_time_s=settling_time,
    )


