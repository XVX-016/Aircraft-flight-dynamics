from __future__ import annotations

import numpy as np

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.database import get_aircraft_model
from aircraft_simulator.sim.analysis.modal_estimators import estimator_invariance_from_signal
from aircraft_simulator.sim.analysis.modal_fidelity import linear_prediction_from_eigenvalue, select_longitudinal_complex_mode
from aircraft_simulator.sim.analysis.trim import compute_level_trim
from aircraft_simulator.sim.control.linearize import linearize
from aircraft_simulator.sim.dynamics.integrator import rk4_step
from aircraft_simulator.sim.model import xdot_full


def test_cessna_short_period_estimator_invariance() -> None:
    model = get_aircraft_model("cessna_172r")
    trim = compute_level_trim(60.0, model.params, limits=model.limits)

    def f(x: np.ndarray, u_vec: np.ndarray) -> np.ndarray:
        ctrl = ControlInputs(
            throttle=float(u_vec[0]),
            aileron=float(u_vec[1]),
            elevator=float(u_vec[2]),
            rudder=float(u_vec[3]),
        )
        return xdot_full(x, ctrl, params=model.params, limits=model.limits)

    A, _B = linearize(f, trim.x0, trim.u0)
    A_lon = A[np.ix_([3, 5, 10, 7], [3, 5, 10, 7])]
    ev = select_longitudinal_complex_mode(A_lon, preference="short_period")
    linear = linear_prediction_from_eigenvalue(ev)

    dt = 0.005
    tfinal = max(10.0, 5.0 * linear.period_s)
    assert tfinal >= 5.0 * linear.period_s

    x = np.asarray(trim.x0, dtype=float).copy()
    V = float(np.hypot(x[3], x[5]))
    alpha = float(np.arctan2(x[5], x[3]) + np.deg2rad(0.5))
    x[3] = V * np.cos(alpha)
    x[5] = V * np.sin(alpha)
    w_trim = float(trim.x0[5])

    t_hist = np.arange(0.0, tfinal + 0.5 * dt, dt)
    w_hist = np.zeros_like(t_hist)
    ctrl = ControlInputs(
        throttle=float(trim.u0[0]),
        aileron=0.0,
        elevator=float(trim.u0[2]),
        rudder=0.0,
    )
    for i, t in enumerate(t_hist):
        w_hist[i] = float(x[5] - w_trim)
        if i < t_hist.size - 1:
            x = rk4_step(
                lambda _tt, xx: xdot_full(xx, ctrl, params=model.params, limits=model.limits),
                float(t),
                x,
                dt,
            )

    inv = estimator_invariance_from_signal(t_hist, w_hist, min_peak_distance_s=0.05)

    assert inv.num_peaks >= 3
    assert inv.amplitude > 1e-4
    assert inv.period_consistency_ratio < 0.05
    assert inv.r2_envelope >= 0.95
    assert inv.r2_energy >= 0.95
    assert inv.rel_peak_fit < 0.05
    assert inv.rel_peak_energy < 0.10
