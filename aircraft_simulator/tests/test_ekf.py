import numpy as np

from sim.estimation.ekf import AttitudeEKF


def test_attitude_ekf_heading_update_reduces_innovation():
    ekf = AttitudeEKF()
    # start at psi=0, true heading=0.5 rad
    z = 0.5
    ekf.predict(p=0.0, q=0.0, r=0.0, dt=0.02)
    out1 = ekf.update_heading(z, R_heading=0.01)
    innov1 = float(out1["innovation"][0])
    # another update should reduce residual magnitude
    ekf.predict(p=0.0, q=0.0, r=0.0, dt=0.02)
    out2 = ekf.update_heading(z, R_heading=0.01)
    innov2 = float(out2["innovation"][0])
    assert abs(innov2) <= abs(innov1) + 1e-9


