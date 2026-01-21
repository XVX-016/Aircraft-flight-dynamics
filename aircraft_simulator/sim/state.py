from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable

import numpy as np


@dataclass
class State:
    """
    12-state rigid-body aircraft state using Euler angles.

    Inertial frame: NED (North-East-Down).
      - Position: (x, y, z) [m] where z is DOWN (so altitude = -z)
      - Attitude: (phi, theta, psi) roll/pitch/yaw [rad]

    Body frame:
      - Linear velocity: (u, v, w) [m/s]
      - Angular rates: (p, q, r) [rad/s]
    """

    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

    u: float = 30.0
    v: float = 0.0
    w: float = 0.0

    phi: float = 0.0
    theta: float = 0.0
    psi: float = 0.0

    p: float = 0.0
    q: float = 0.0
    r: float = 0.0

    def as_vector(self) -> np.ndarray:
        return np.array(
            [
                self.x,
                self.y,
                self.z,
                self.u,
                self.v,
                self.w,
                self.phi,
                self.theta,
                self.psi,
                self.p,
                self.q,
                self.r,
            ],
            dtype=float,
        )

    @staticmethod
    def from_vector(x: Iterable[float]) -> "State":
        v = np.asarray(list(x), dtype=float).reshape(12)
        return State(
            x=float(v[0]),
            y=float(v[1]),
            z=float(v[2]),
            u=float(v[3]),
            v=float(v[4]),
            w=float(v[5]),
            phi=float(v[6]),
            theta=float(v[7]),
            psi=float(v[8]),
            p=float(v[9]),
            q=float(v[10]),
            r=float(v[11]),
        )

    def as_dict(self) -> Dict[str, float]:
        return {
            "x": self.x,
            "y": self.y,
            "z": self.z,
            "u": self.u,
            "v": self.v,
            "w": self.w,
            "phi": self.phi,
            "theta": self.theta,
            "psi": self.psi,
            "p": self.p,
            "q": self.q,
            "r": self.r,
        }


def airspeed(state: State) -> float:
    return float(np.sqrt(state.u**2 + state.v**2 + state.w**2))


