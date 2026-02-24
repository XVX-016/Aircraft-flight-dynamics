from __future__ import annotations

from pathlib import Path

import numpy as np

from adcs_core.aircraft.aerodynamics import ControlInputs
from adcs_core.aircraft.database import get_aircraft_model
from adcs_core.analysis.lqr_longitudinal import design_longitudinal_lqr
from adcs_core.analysis.trim import compute_level_trim
from adcs_core.control.linearize import linearize
from adcs_core.dynamics.integrator import rk4_step
from adcs_core.model import xdot_full


BASELINE_DIR = Path("aircraft_simulator/tests/baseline")
DT_S = 0.01
HORIZON_S = 5.0
SAMPLE_INDEX = 50


def canonicalize_eigs(eigs: np.ndarray) -> np.ndarray:
    eigs = np.asarray(eigs, dtype=complex).reshape(-1)
    idx = np.lexsort((-eigs.imag, -eigs.real))
    return eigs[idx]


def _linearize_at_trim(aircraft_id: str, speed_mps: float) -> tuple[np.ndarray, np.ndarray]:
    model = get_aircraft_model(aircraft_id)
    trim = compute_level_trim(speed_mps, model.params, limits=model.limits)

    def f(x: np.ndarray, u_vec: np.ndarray) -> np.ndarray:
        ctrl = ControlInputs(
            throttle=float(u_vec[0]),
            aileron=float(u_vec[1]),
            elevator=float(u_vec[2]),
            rudder=float(u_vec[3]),
        )
        return xdot_full(x, ctrl, params=model.params, limits=model.limits)

    return linearize(f, trim.x0, trim.u0)


def _select_reference_eigs(A: np.ndarray) -> np.ndarray:
    A_d = np.asarray(A, dtype=float)[3:12, 3:12]
    eig_d = np.linalg.eigvals(A_d)
    max_real = eig_d[np.argmax(np.real(eig_d))]

    lon_idx = [0, 2, 7, 4]  # [u, w, q, theta] in A_d coordinates
    A_lon = A_d[np.ix_(lon_idx, lon_idx)]
    eig_lon = np.linalg.eigvals(A_lon)
    lon_complex = [ev for ev in eig_lon if ev.imag > 1e-10]
    short_period = max(lon_complex, key=lambda ev: abs(ev.imag))

    lat_idx = [1, 3, 5, 6, 8]  # [v, phi, psi, p, r]
    A_lat = A_d[np.ix_(lat_idx, lat_idx)]
    eig_lat = np.linalg.eigvals(A_lat)
    lat_complex = [ev for ev in eig_lat if ev.imag > 1e-10]
    dutch_roll = max(lat_complex, key=lambda ev: abs(ev.imag))

    selected = np.array([max_real, short_period, np.conjugate(short_period), dutch_roll], dtype=complex)
    return canonicalize_eigs(selected)


def _trajectory_sample(aircraft_id: str, speed_mps: float, K: np.ndarray) -> np.ndarray:
    model = get_aircraft_model(aircraft_id)
    trim = compute_level_trim(speed_mps, model.params, limits=model.limits)
    x_ref = np.asarray(trim.x0, dtype=float)
    u_ref = np.asarray(trim.u0, dtype=float)

    x = x_ref.copy()
    V = float(np.hypot(x[3], x[5]))
    alpha = float(np.arctan2(x[5], x[3]) + np.deg2rad(0.5))
    x[3] = V * np.cos(alpha)
    x[5] = V * np.sin(alpha)

    t = np.arange(0.0, HORIZON_S + 0.5 * DT_S, DT_S)
    assert SAMPLE_INDEX < t.size

    lon_idx = np.array([3, 5, 10, 7], dtype=int)

    def f_dyn(_tt: float, xx: np.ndarray) -> np.ndarray:
        x_sub = xx[lon_idx]
        x_ref_sub = x_ref[lon_idx]
        du = -K @ (x_sub - x_ref_sub)
        de = float(np.clip(u_ref[2] + du[0], -model.limits.elevator_max_rad, model.limits.elevator_max_rad))
        thr = float(np.clip(u_ref[0] + du[1], 0.0, 1.0))
        ctrl = ControlInputs(throttle=thr, aileron=0.0, elevator=de, rudder=0.0)
        return xdot_full(xx, ctrl, params=model.params, limits=model.limits)

    x_hist = np.zeros((t.size, x.size), dtype=float)
    for i, tt in enumerate(t):
        x_hist[i] = x
        if i < t.size - 1:
            x = rk4_step(f_dyn, float(tt), x, DT_S)
    return np.array([x_hist[SAMPLE_INDEX, 7], x_hist[SAMPLE_INDEX, 10], x_hist[SAMPLE_INDEX, 3], x_hist[SAMPLE_INDEX, 4]])


def test_golden_baseline_invariants() -> None:
    assert BASELINE_DIR.exists(), "Missing baseline directory. Run scripts/generate_golden_baseline.py first."

    eigs_expected = np.load(BASELINE_DIR / "golden_eigs.npy")
    trim_expected = np.load(BASELINE_DIR / "golden_trim.npz")
    K_expected = np.load(BASELINE_DIR / "golden_K.npy")
    sample_expected = np.load(BASELINE_DIR / "golden_sample.npy")

    assert DT_S == 0.01
    assert HORIZON_S == 5.0

    aircraft_id = "f16_research"
    speed_mps = 150.0

    A, B = _linearize_at_trim(aircraft_id, speed_mps)
    eigs_now = _select_reference_eigs(A)
    assert np.allclose(canonicalize_eigs(eigs_now), eigs_expected, rtol=1e-8, atol=1e-10)

    model = get_aircraft_model(aircraft_id)
    trim = compute_level_trim(speed_mps, model.params, limits=model.limits)
    assert np.allclose(np.asarray(trim.x0, dtype=float), trim_expected["x0"], rtol=1e-9, atol=1e-11)
    assert float(trim.residual_norm) < 1e-9
    assert abs(float(trim.residual_norm) - float(trim_expected["residual_norm"][0])) < 1e-10

    lqr = design_longitudinal_lqr(A, B)
    assert np.allclose(np.asarray(lqr.K, dtype=float), K_expected, rtol=1e-8, atol=1e-10)

    sample_now = _trajectory_sample(aircraft_id, speed_mps, np.asarray(lqr.K, dtype=float))
    assert np.allclose(sample_now, sample_expected, rtol=1e-7, atol=1e-9)
