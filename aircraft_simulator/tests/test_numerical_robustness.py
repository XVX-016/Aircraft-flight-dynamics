from __future__ import annotations

import numpy as np

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.database import get_aircraft_model
from aircraft_simulator.sim.analysis.modal_fidelity import select_longitudinal_complex_mode
from aircraft_simulator.sim.analysis.numerical_robustness import run_amplitude_sweep, run_dt_convergence
from aircraft_simulator.sim.analysis.trim import compute_level_trim
from aircraft_simulator.sim.control.linearize import linearize
from aircraft_simulator.sim.model import xdot_full


def test_dt_convergence_uses_invariant_estimators_and_is_numerically_stable() -> None:
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

    result = run_dt_convergence(
        params=model.params,
        limits=model.limits,
        trim=trim,
        eigenvalue=ev,
        dt_values_s=(0.01, 0.005, 0.0025),
        alpha_perturb_deg=0.5,
        signal="w",
    )

    assert len(result.points) == 3
    for p in result.points:
        assert p.num_peaks >= 3
        assert p.r2_envelope >= 0.95
        assert p.r2_energy >= 0.95
        assert p.period_consistency_ratio < 0.05

    # Numerical convergence behavior: finer-step deltas should shrink.
    assert result.monotonic_sigma
    assert result.monotonic_omega
    assert result.monotonic_zeta

    # dt2 -> dt3 should be very small in this benchmark.
    p1, p2, p3 = result.points
    assert abs(p3.sigma - p2.sigma) < 1e-3
    assert abs(p3.omega_d - p2.omega_d) < 1e-3
    assert abs(p3.zeta - p2.zeta) < 1e-3
    assert abs(result.delta_dt23_sigma - abs(p3.sigma - p2.sigma)) < 1e-12
    assert abs(result.delta_dt23_omega - abs(p3.omega_d - p2.omega_d)) < 1e-12
    assert abs(result.delta_dt23_zeta - abs(p3.zeta - p2.zeta)) < 1e-12


def test_amplitude_sweep_is_stable_and_reports_linear_region_metrics() -> None:
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

    result = run_amplitude_sweep(
        params=model.params,
        limits=model.limits,
        trim=trim,
        eigenvalue=ev,
        amplitudes_deg=(0.1, 0.5, 1.0, 2.0),
        dt_s=0.005,
        signal="w",
    )

    assert len(result.points) == 4
    for p in result.points:
        assert p.num_peaks >= 3
        assert p.r2_envelope >= 0.95
        assert p.r2_energy >= 0.95
        assert p.period_consistency_ratio < 0.05

    # Keep hard upper bounds for large-amplitude sweep behavior.
    p20 = result.points[-1]
    assert p20.sigma_error_percent < 20.0
    assert p20.zeta_error_percent < 20.0
    assert p20.omega_error_percent < 2.0
