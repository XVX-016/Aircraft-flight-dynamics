from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np


@dataclass(frozen=True)
class AircraftParameters:
    # --- mass/inertia ---
    mass_kg: float = 1200.0
    inertia_kgm2: np.ndarray = field(
        default_factory=lambda: np.diag([900.0, 1200.0, 1800.0])
    )  # Ix, Iy, Iz (simple)

    # --- geometry ---
    S_m2: float = 16.2  # wing area
    cbar_m: float = 1.5  # mean aerodynamic chord
    b_m: float = 10.9  # span

    # --- environment ---
    rho_kgm3: float = 1.225
    g_ms2: float = 9.80665

    # --- propulsion (placeholder) ---
    max_thrust_N: float = 2500.0

    # --- longitudinal aero (placeholder) ---
    CL0: float = 0.25
    CL_alpha_per_rad: float = 5.0
    CL_q: float = 0.0  # optional nondim rate derivative (Phase 2 keeps simple)
    CL_de_per_rad: float = 0.35

    CD0: float = 0.03
    CD_k: float = 0.04  # induced-like term vs CL^2

    Cm0: float = 0.02
    Cm_alpha_per_rad: float = -1.0
    Cm_q_per_rad: float = -8.0  # nondim pitch damping
    Cm_de_per_rad: float = -1.1

    # --- lateral/directional aero (very simple placeholder) ---
    CY_beta_per_rad: float = -0.7
    CY_dr_per_rad: float = 0.17

    Cl_beta_per_rad: float = -0.12
    Cl_p: float = -0.5
    Cl_r: float = 0.2
    Cl_da_per_rad: float = 0.08
    Cl_dr_per_rad: float = 0.02

    Cn_beta_per_rad: float = 0.25
    Cn_p: float = -0.06
    Cn_r: float = -0.3
    Cn_da_per_rad: float = 0.02
    Cn_dr_per_rad: float = -0.12


def qbar(rho: float, V: float) -> float:
    return 0.5 * rho * V * V


