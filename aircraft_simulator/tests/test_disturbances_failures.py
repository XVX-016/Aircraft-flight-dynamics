import numpy as np
import pandas as pd

from sim.control.autopilot import AutopilotTargets
from sim.simulator import run


def test_runs_with_wind_disturbance(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    targets = AutopilotTargets(airspeed_mps=35.0, altitude_m=1000.0, heading_rad=0.0)
    out_path, _ = run(
        tfinal=5.0,
        dt=0.02,
        autopilot_enabled=True,
        targets=targets,
        actuator_tau=0.15,
        seed=10,
        wind_ned_mps=(5.0, 0.0, 0.0),
    )
    df = pd.read_csv(out_path)
    assert "wind_n_mps" in df.columns
    assert np.isfinite(df["truth_altitude_m"].iloc[-1])



