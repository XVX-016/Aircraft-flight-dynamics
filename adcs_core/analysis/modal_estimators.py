from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.signal import find_peaks


@dataclass(frozen=True)
class PeakSeries:
    t_peaks: np.ndarray
    x_peaks_abs: np.ndarray
    period_half_s: float
    period_full_s: float
    period_consistency_ratio: float


@dataclass(frozen=True)
class EstimatorInvarianceResult:
    sigma_peak: float
    sigma_fit: float
    sigma_energy: float
    r2_envelope: float
    r2_energy: float
    period_consistency_ratio: float
    num_peaks: int
    amplitude: float
    rel_peak_fit: float
    rel_peak_energy: float


def _r2_score(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    y = np.asarray(y_true, dtype=float)
    yp = np.asarray(y_pred, dtype=float)
    ss_res = float(np.sum((y - yp) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    if ss_tot <= 1e-20:
        return 1.0
    return 1.0 - ss_res / ss_tot


def extract_peak_series(
    t: np.ndarray,
    signal: np.ndarray,
    *,
    min_peak_distance_s: float = 0.05,
    min_prominence_ratio: float = 1e-5,
) -> PeakSeries:
    tt = np.asarray(t, dtype=float).reshape(-1)
    xx = np.asarray(signal, dtype=float).reshape(-1)

    assert tt.size == xx.size and tt.size >= 8
    assert not np.isnan(xx).any()

    amp = float(np.max(np.abs(xx)))
    assert amp > 1e-4

    dt = float(np.median(np.diff(tt)))
    min_distance = max(1, int(np.ceil(min_peak_distance_s / max(1e-12, dt))))
    prominence = max(1e-12, min_prominence_ratio * amp)
    # Use absolute local maxima to capture damped oscillation envelope.
    peaks, _ = find_peaks(np.abs(xx), distance=min_distance, prominence=prominence)
    assert peaks.size >= 3

    # Use first 3 strong peaks to avoid late-time slow-mode contamination.
    peaks = peaks[:3]
    y_abs = np.abs(xx)
    t_peaks = []
    x_peaks_abs = []
    for idx in peaks:
        if 0 < idx < (y_abs.size - 1):
            y0 = float(y_abs[idx - 1])
            y1 = float(y_abs[idx])
            y2 = float(y_abs[idx + 1])
            denom = (y0 - 2.0 * y1 + y2)
            if abs(denom) > 1e-15:
                delta = 0.5 * (y0 - y2) / denom
                delta = float(np.clip(delta, -1.0, 1.0))
                t_ref = float(tt[idx] + delta * dt)
                y_ref = float(y1 - 0.25 * (y0 - y2) * delta)
            else:
                t_ref = float(tt[idx])
                y_ref = float(y1)
        else:
            t_ref = float(tt[idx])
            y_ref = float(y_abs[idx])
        t_peaks.append(t_ref)
        x_peaks_abs.append(max(1e-15, y_ref))
    t_peaks = np.asarray(t_peaks, dtype=float)
    x_peaks_abs = np.asarray(x_peaks_abs, dtype=float)
    # Strictly decreasing envelope for clean single-mode behavior.
    assert np.all(x_peaks_abs[1:] < x_peaks_abs[:-1])

    periods_half = np.diff(t_peaks)
    assert periods_half.size >= 2
    assert np.all(periods_half > 0.0)
    ratio = float(np.std(periods_half) / max(1e-12, np.mean(periods_half)))
    assert ratio < 0.05

    period_half = float(np.mean(periods_half))
    period_full = float(2.0 * period_half)
    return PeakSeries(
        t_peaks=t_peaks,
        x_peaks_abs=x_peaks_abs,
        period_half_s=period_half,
        period_full_s=period_full,
        period_consistency_ratio=ratio,
    )


def estimate_sigma_peak(peaks: PeakSeries) -> float:
    n = peaks.x_peaks_abs.size - 1
    delta = float(np.log(peaks.x_peaks_abs[0] / peaks.x_peaks_abs[-1]) / n)
    return float(-delta / peaks.period_half_s)


def estimate_sigma_fit(peaks: PeakSeries) -> tuple[float, float]:
    y = np.log(np.maximum(peaks.x_peaks_abs, 1e-15))
    coeff = np.polyfit(peaks.t_peaks, y, 1)
    y_pred = np.polyval(coeff, peaks.t_peaks)
    sigma_fit = float(coeff[0])
    r2 = _r2_score(y, y_pred)
    return sigma_fit, float(r2)


def estimate_sigma_energy(
    t: np.ndarray,
    signal: np.ndarray,
    *,
    peak_times_s: np.ndarray | None = None,
) -> tuple[float, float]:
    tt = np.asarray(t, dtype=float).reshape(-1)
    xx = np.asarray(signal, dtype=float).reshape(-1)
    assert tt.size == xx.size and tt.size >= 8
    dt = float(np.median(np.diff(tt)))

    xdot = np.gradient(xx, dt, edge_order=2)
    energy = xx * xx + xdot * xdot
    loge = np.log(np.maximum(energy, 1e-15))

    if peak_times_s is None:
        t_fit = tt
        y_fit = loge
    else:
        t_fit = np.asarray(peak_times_s, dtype=float).reshape(-1)
        assert t_fit.size >= 3
        y_fit = np.interp(t_fit, tt, loge)
    assert t_fit.size >= 3

    coeff = np.polyfit(t_fit, y_fit, 1)
    y_pred = np.polyval(coeff, t_fit)
    sigma_energy = float(0.5 * coeff[0])
    r2 = _r2_score(y_fit, y_pred)
    return sigma_energy, float(r2)


def estimator_invariance_from_signal(
    t: np.ndarray,
    signal: np.ndarray,
    *,
    min_peak_distance_s: float = 0.05,
    min_prominence_ratio: float = 1e-5,
) -> EstimatorInvarianceResult:
    peaks = extract_peak_series(
        t,
        signal,
        min_peak_distance_s=min_peak_distance_s,
        min_prominence_ratio=min_prominence_ratio,
    )
    sigma_peak = estimate_sigma_peak(peaks)
    sigma_fit, r2_env = estimate_sigma_fit(peaks)
    sigma_energy, r2_energy = estimate_sigma_energy(
        t,
        signal,
        peak_times_s=peaks.t_peaks,
    )

    rel_peak_fit = float(abs(sigma_peak - sigma_fit) / max(1e-12, abs(sigma_peak)))
    rel_peak_energy = float(abs(sigma_peak - sigma_energy) / max(1e-12, abs(sigma_peak)))

    # Hard acceptance constraints.
    assert r2_env >= 0.95
    assert r2_energy >= 0.95
    assert np.sign(sigma_peak) == np.sign(sigma_fit)
    assert np.sign(sigma_peak) == np.sign(sigma_energy)
    assert rel_peak_fit < 0.05
    assert rel_peak_energy < 0.10

    return EstimatorInvarianceResult(
        sigma_peak=sigma_peak,
        sigma_fit=sigma_fit,
        sigma_energy=sigma_energy,
        r2_envelope=r2_env,
        r2_energy=r2_energy,
        period_consistency_ratio=peaks.period_consistency_ratio,
        num_peaks=int(peaks.x_peaks_abs.size),
        amplitude=float(np.max(np.abs(signal))),
        rel_peak_fit=rel_peak_fit,
        rel_peak_energy=rel_peak_energy,
    )
