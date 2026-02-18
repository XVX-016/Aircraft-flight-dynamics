from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np


@dataclass(frozen=True)
class AircraftParameters:
    # --- mass/inertia ---
    mass_kg: float = 1111.0
    inertia_kgm2: np.ndarray = field(
        default_factory=lambda: np.diag([1285.0, 1824.0, 2666.0])
    )  # Ix, Iy, Iz

    # --- geometry ---
    S_m2: float = 16.2  # wing area
    cbar_m: float = 1.49  # mean aerodynamic chord
    b_m: float = 11.0  # span

    # --- environment ---
    rho_kgm3: float = 1.225
    g_ms2: float = 9.80665

    # --- propulsion ---
    max_thrust_N: float = 2400.0

    # --- longitudinal aero ---
    CL0: float = 0.25
    CL_alpha_per_rad: float = 5.7
    CL_q: float = 8.5  # nondim rate derivative
    CL_de_per_rad: float = 0.4

    CD0: float = 0.027
    CD_k: float = 0.053  # induced drag factor

    Cm0: float = 0.02
    Cm_alpha_per_rad: float = -3.8
    Cm_q_per_rad: float = -8.5
    Cm_de_per_rad: float = -1.2

    # --- lateral/directional aero ---
    CY_beta_per_rad: float = -0.98
    CY_dr_per_rad: float = 0.15

    Cl_beta_per_rad: float = -0.12
    Cl_p: float = -0.5
    Cl_r: float = 0.15
    Cl_da_per_rad: float = 0.08
    Cl_dr_per_rad: float = 0.01

    Cn_beta_per_rad: float = 0.15
    Cn_p: float = -0.05
    Cn_r: float = -0.2
    Cn_da_per_rad: float = -0.02
    Cn_dr_per_rad: float = -0.08


def qbar(rho: float, V: float) -> float:
    return 0.5 * rho * V * V


