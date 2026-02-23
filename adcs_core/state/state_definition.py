from __future__ import annotations

from enum import IntEnum


class StateIndex(IntEnum):
    X = 0
    Y = 1
    Z = 2
    U = 3
    V = 4
    W = 5
    PHI = 6
    THETA = 7
    PSI = 8
    P = 9
    Q = 10
    R = 11


class ControlIndex(IntEnum):
    THROTTLE = 0
    AILERON = 1
    ELEVATOR = 2
    RUDDER = 3


class DynamicStateIndex(IntEnum):
    U = 0
    V = 1
    W = 2
    PHI = 3
    THETA = 4
    PSI = 5
    P = 6
    Q = 7
    R = 8


STATE_ORDER = [s.name for s in StateIndex]
CONTROL_ORDER = [c.name for c in ControlIndex]
DYNAMIC_STATE_ORDER = [s.name for s in DynamicStateIndex]

VELOCITY_INDICES = [StateIndex.U, StateIndex.V, StateIndex.W]
RATE_INDICES = [StateIndex.P, StateIndex.Q, StateIndex.R]
ANGLE_INDICES = [StateIndex.PHI, StateIndex.THETA, StateIndex.PSI]
POSITION_INDICES = [StateIndex.X, StateIndex.Y, StateIndex.Z]
