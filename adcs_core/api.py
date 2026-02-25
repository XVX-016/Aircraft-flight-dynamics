from __future__ import annotations

import numpy as np

from adcs_core.aircraft.aerodynamics import ControlInputs
from adcs_core.aircraft.database import get_aircraft_model
from adcs_core.aircraft.forces_moments import ActuatorLimits, forces_and_moments_body
from adcs_core.aircraft.parameters import AircraftParameters
from adcs_core.analysis.lqr_longitudinal import LongitudinalLqrDesign, design_longitudinal_lqr
from adcs_core.analysis.modal_analysis import ModalAnalysisResult, analyze_modal_structure
from adcs_core.analysis.trim import TrimResult, compute_level_trim
from adcs_core.control.actuators import ActuatorState
from adcs_core.control.autopilot import Autopilot, AutopilotTargets
from adcs_core.control.failure_modes import FailureManager
from adcs_core.dynamics.integrator import rk4_step
from adcs_core.dynamics.linearize import linearize
from adcs_core.dynamics.equations import derivatives_6dof, post_step_sanitize, rotation_body_to_inertial
from adcs_core.environment.wind import WindModel
from adcs_core.model import xdot_full
from adcs_core.sensors.airspeed import AirspeedSensor
from adcs_core.sensors.altimeter import Altimeter
from adcs_core.sensors.compass import Compass
from adcs_core.sensors.imu import IMU
from adcs_core.state import State
from adcs_core.state.state_definition import ControlIndex, StateIndex


def compute_trim(*args, **kwargs) -> TrimResult:
    """Public trim entrypoint."""
    return compute_level_trim(*args, **kwargs)


def compute_modal_analysis(A: np.ndarray, *args, **kwargs) -> ModalAnalysisResult:
    """Public modal analysis entrypoint."""
    return analyze_modal_structure(A, *args, **kwargs)


def compute_lqr_longitudinal(A: np.ndarray, B: np.ndarray, *args, **kwargs) -> LongitudinalLqrDesign:
    """Public longitudinal LQR design entrypoint."""
    return design_longitudinal_lqr(A, B, *args, **kwargs)


__all__ = [
    "ControlIndex",
    "ControlInputs",
    "ActuatorLimits",
    "AircraftParameters",
    "get_aircraft_model",
    "forces_and_moments_body",
    "ActuatorState",
    "Autopilot",
    "AutopilotTargets",
    "FailureManager",
    "derivatives_6dof",
    "post_step_sanitize",
    "rotation_body_to_inertial",
    "WindModel",
    "AirspeedSensor",
    "Altimeter",
    "Compass",
    "IMU",
    "State",
    "LongitudinalLqrDesign",
    "ModalAnalysisResult",
    "StateIndex",
    "TrimResult",
    "analyze_modal_structure",
    "compute_level_trim",
    "compute_lqr_longitudinal",
    "compute_modal_analysis",
    "compute_trim",
    "design_longitudinal_lqr",
    "linearize",
    "rk4_step",
    "xdot_full",
]
