from __future__ import annotations

"""
Standard atmosphere utilities (ISA 1976 simplified).

These are not yet wired into the aero model but provide the hooks to make
rho, a, etc. altitude-dependent for higher-fidelity simulations.
"""

from dataclasses import dataclass

import numpy as np


R = 287.05  # J/(kg*K)
G0 = 9.80665  # m/s^2


@dataclass(frozen=True)
class ISAParams:
    T0: float = 288.15  # K
    p0: float = 101325.0  # Pa
    lapse_rate: float = -0.0065  # K/m up to 11 km


def isa_atmosphere(h_m: float, params: ISAParams | None = None) -> tuple[float, float, float, float]:
    """
    Returns (T [K], p [Pa], rho [kg/m3], a [m/s]) for geopotential altitude h (m).
    Valid for ~0-11 km in this simple form.
    """
    p = params or ISAParams()
    h = float(max(h_m, 0.0))
    T = p.T0 + p.lapse_rate * h
    if T <= 0.0:
        T = 1.0
    exponent = -G0 / (p.lapse_rate * R)
    p_static = p.p0 * (T / p.T0) ** exponent
    rho = p_static / (R * T)
    a = np.sqrt(1.4 * R * T)
    return float(T), float(p_static), float(rho), float(a)


