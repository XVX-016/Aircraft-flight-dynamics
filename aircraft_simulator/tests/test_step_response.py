import pandas as pd

from sim.analysis.metrics import step_response_metrics
from sim.control.autopilot import AutopilotTargets
from sim.simulator import run


def test_altitude_step_response_metrics_smoke(tmp_path, monkeypatch):
    # run writes to logs/; keep it in tmp dir for test isolation
    monkeypatch.chdir(tmp_path)

    targets = AutopilotTargets(airspeed_mps=35.0, altitude_m=1100.0, heading_rad=0.0)
    out_path, _ = run(
        tfinal=8.0,
        dt=0.02,
        autopilot_enabled=True,
        targets=targets,
        actuator_tau=0.15,
        seed=3,
        wind_ned_mps=(0.0, 0.0, 0.0),
    )

    df = pd.read_csv(out_path)
    m = step_response_metrics(df["t"], df["truth_altitude_m"], y_target=1100.0)

    # sanity bounds: we expect it to move in the right direction and settle somewhat
    assert m.step_amplitude > 0
    assert m.overshoot_frac >= 0.0
    # settling time may be None for short horizon; allow but ensure no crazy overshoot
    assert m.overshoot_frac < 1.0


