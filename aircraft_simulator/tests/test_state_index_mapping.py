from __future__ import annotations

import numpy as np

from adcs_core.state.state_definition import ControlIndex, StateIndex


def test_state_index_mapping_consistency() -> None:
    x = np.arange(12)
    assert x[StateIndex.W] == 5
    assert x[StateIndex.THETA] == 7
    assert x[StateIndex.Q] == 10


def test_control_index_mapping_consistency() -> None:
    u = np.arange(4)
    assert u[ControlIndex.THROTTLE] == 0
    assert u[ControlIndex.ELEVATOR] == 2
