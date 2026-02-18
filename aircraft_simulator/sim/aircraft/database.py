from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

import numpy as np

from aircraft_simulator.sim.aircraft.parameters import AircraftParameters
from aircraft_simulator.sim.aircraft.forces_moments import ActuatorLimits


@dataclass(frozen=True)
class AircraftGeometry:
    wing_area: float
    wingspan: float
    mean_aerodynamic_chord: float
    tail_arm: float
    cg_location: float


@dataclass(frozen=True)
class AircraftInertia:
    mass: float
    Ixx: float
    Iyy: float
    Izz: float
    Ixz: float = 0.0


@dataclass(frozen=True)
class AerodynamicDerivatives:
    # Longitudinal (dimensional, representative)
    Xu: float
    Xw: float
    Zu: float
    Zw: float
    Mu: float
    Mw: float
    Mq: float

    # Lateral (dimensional, representative)
    Yv: float
    Lv: float
    Lp: float
    Nr: float


@dataclass(frozen=True)
class AircraftModel:
    id: str
    name: str
    classification: str  # "trainer" | "fighter" | "transport"
    stability_mode: str  # "stable" | "relaxed" | "unstable"
    geometry: AircraftGeometry
    inertia: AircraftInertia
    aero_derivatives: AerodynamicDerivatives
    params: AircraftParameters
    limits: ActuatorLimits
    metadata: dict


def _inertia_tensor(Ixx: float, Iyy: float, Izz: float, Ixz: float) -> np.ndarray:
    return np.array(
        [
            [Ixx, 0.0, -Ixz],
            [0.0, Iyy, 0.0],
            [-Ixz, 0.0, Izz],
        ],
        dtype=float,
    )


def _build_c172() -> AircraftModel:
    inertia = AircraftInertia(mass=1100.0, Ixx=1285.0, Iyy=1824.0, Izz=2666.0, Ixz=0.0)
    geometry = AircraftGeometry(
        wing_area=16.2,
        wingspan=11.0,
        mean_aerodynamic_chord=1.5,
        tail_arm=4.5,
        cg_location=0.30,
    )
    aero = AerodynamicDerivatives(
        Xu=-0.03, Xw=0.0, Zu=-0.4, Zw=-5.5, Mu=0.0, Mw=-0.8, Mq=-10.0,
        Yv=-0.3, Lv=-0.1, Lp=-2.7, Nr=-0.35,
    )
    params = AircraftParameters(
        mass_kg=inertia.mass,
        inertia_kgm2=_inertia_tensor(inertia.Ixx, inertia.Iyy, inertia.Izz, inertia.Ixz),
        S_m2=geometry.wing_area,
        cbar_m=geometry.mean_aerodynamic_chord,
        b_m=geometry.wingspan,
        rho_kgm3=1.006,
        max_thrust_N=4000.0,
        CL0=0.25,
        CL_alpha_per_rad=4.5,
        CL_q=8.5,
        CL_de_per_rad=0.4,
        CD0=0.025,
        CD_k=0.053,
        Cm0=0.0,
        Cm_alpha_per_rad=-0.8,
        Cm_q_per_rad=-10.0,
        Cm_de_per_rad=-1.2,
        CY_beta_per_rad=-0.3,
        CY_dr_per_rad=0.15,
        Cl_beta_per_rad=-0.1,
        Cl_p=-2.7,
        Cl_r=0.15,
        Cl_da_per_rad=0.2,
        Cl_dr_per_rad=0.01,
        Cn_beta_per_rad=0.15,
        Cn_p=-0.05,
        Cn_r=-0.35,
        Cn_da_per_rad=-0.02,
        Cn_dr_per_rad=-0.08,
    )
    limits = ActuatorLimits(
        elevator_max_rad=np.deg2rad(25.0),
        aileron_max_rad=np.deg2rad(20.0),
        rudder_max_rad=np.deg2rad(30.0),
    )
    return AircraftModel(
        id="cessna_172r",
        name="Cessna 172R",
        classification="trainer",
        stability_mode="stable",
        geometry=geometry,
        inertia=inertia,
        aero_derivatives=aero,
        params=params,
        limits=limits,
        metadata={"source": "Academic nominal dataset", "notes": "Stable trainer reference"},
    )


def _build_f16() -> AircraftModel:
    inertia = AircraftInertia(mass=12000.0, Ixx=12875.0, Iyy=75673.0, Izz=85552.0, Ixz=1331.0)
    geometry = AircraftGeometry(
        wing_area=27.87,
        wingspan=9.45,
        mean_aerodynamic_chord=3.3,
        tail_arm=5.5,
        cg_location=0.40,
    )
    aero = AerodynamicDerivatives(
        Xu=-0.02, Xw=0.0, Zu=-1.2, Zw=-3.5, Mu=0.02, Mw=0.15, Mq=-8.0,
        Yv=-0.5, Lv=-0.12, Lp=-3.5, Nr=-0.6,
    )
    params = AircraftParameters(
        mass_kg=inertia.mass,
        inertia_kgm2=_inertia_tensor(inertia.Ixx, inertia.Iyy, inertia.Izz, inertia.Ixz),
        S_m2=geometry.wing_area,
        cbar_m=geometry.mean_aerodynamic_chord,
        b_m=geometry.wingspan,
        rho_kgm3=0.736,
        max_thrust_N=79000.0,
        CL0=0.05,
        CL_alpha_per_rad=4.2,
        CL_q=12.0,
        CL_de_per_rad=0.2,
        CD0=0.02,
        CD_k=0.053,
        Cm0=0.0,
        Cm_alpha_per_rad=0.15,
        Cm_q_per_rad=-8.0,
        Cm_de_per_rad=-0.5,
        CY_beta_per_rad=-0.5,
        CY_dr_per_rad=0.15,
        Cl_beta_per_rad=-0.12,
        Cl_p=-3.5,
        Cl_r=0.14,
        Cl_da_per_rad=-0.08,
        Cl_dr_per_rad=0.015,
        Cn_beta_per_rad=0.18,
        Cn_p=-0.02,
        Cn_r=-0.6,
        Cn_da_per_rad=0.005,
        Cn_dr_per_rad=-0.07,
    )
    limits = ActuatorLimits(
        elevator_max_rad=np.deg2rad(25.0),
        aileron_max_rad=np.deg2rad(21.5),
        rudder_max_rad=np.deg2rad(30.0),
    )
    return AircraftModel(
        id="f16_research",
        name="F-16 Fighting Falcon (Research)",
        classification="fighter",
        stability_mode="relaxed",
        geometry=geometry,
        inertia=inertia,
        aero_derivatives=aero,
        params=params,
        limits=limits,
        metadata={"source": "Research nominal dataset", "notes": "Relaxed static stability"},
    )


_AIRCRAFT_DB: Dict[str, AircraftModel] = {
    "cessna_172r": _build_c172(),
    "f16_research": _build_f16(),
}


def list_aircraft_ids() -> list[str]:
    return sorted(_AIRCRAFT_DB.keys())


def get_aircraft_model(aircraft_id: str) -> AircraftModel:
    if aircraft_id not in _AIRCRAFT_DB:
        raise KeyError(f"Unknown aircraft_id '{aircraft_id}'. Available: {list_aircraft_ids()}")
    return _AIRCRAFT_DB[aircraft_id]
