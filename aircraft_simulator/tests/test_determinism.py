from __future__ import annotations

import numpy as np
import pandas as pd

from sim.control.autopilot import AutopilotTargets
from sim.simulator import run


def test_sim_determinism_same_seed_same_trajectory(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)

    targets = AutopilotTargets(airspeed_mps=35.0, altitude_m=1050.0, heading_rad=0.0)
    kwargs = dict(
        tfinal=4.0,
        dt=0.02,
        autopilot_enabled=True,
        targets=targets,
        actuator_tau=0.15,
        seed=13,
        wind_ned_mps=(1.0, -0.5, 0.0),
    )

    out1, _ = run(**kwargs)
    out2, _ = run(**kwargs)

    df1 = pd.read_csv(out1)
    df2 = pd.read_csv(out2)

    cols = [
        "t",
        "truth_altitude_m",
        "truth_phi_rad",
        "truth_theta_rad",
        "truth_psi_rad",
        "truth_u_mps",
        "truth_v_mps",
        "truth_w_mps",
        "u_throttle",
        "u_elevator",
        "u_aileron",
        "u_rudder",
        "wind_n_mps",
        "wind_e_mps",
        "wind_d_mps",
    ]

    a = df1[cols].to_numpy(dtype=float)
    b = df2[cols].to_numpy(dtype=float)
    assert a.shape == b.shape
    assert np.allclose(a, b, atol=1e-12, rtol=0.0)

