from __future__ import annotations

from adcs_core.aircraft.aerodynamics import ControlInputs
from adcs_core.aircraft.database import AircraftModel, get_aircraft_model
from adcs_core.aircraft.forces_moments import ActuatorLimits
from adcs_core.aircraft.parameters import AircraftParameters
from adcs_core.analysis.jacobian_validation import JacobianValidationResult, validate_jacobian
from adcs_core.analysis.lqr_longitudinal import (
    LONGITUDINAL_INPUT_IDX_FULL,
    LONGITUDINAL_STATE_IDX_FULL,
    LongitudinalLqrDesign,
    LongitudinalResponseMetrics,
    OpenClosedResponseComparison,
    compare_open_closed_longitudinal_response,
    design_longitudinal_lqr,
    simulate_longitudinal_perturbation,
)
from adcs_core.analysis.modal_analysis import ModalAnalysisResult, ModeSummary, analyze_modal_structure, modal_table
from adcs_core.analysis.modal_fidelity import (
    LinearModePrediction,
    ModalFidelityResult,
    NonlinearModeEstimate,
    UnstableGrowthEstimate,
    estimate_unstable_growth_rate,
    linear_prediction_from_eigenvalue,
    select_longitudinal_complex_mode,
    validate_modal_fidelity,
)
from adcs_core.analysis.numerical_robustness import (
    AmplitudeSweepPoint,
    AmplitudeSweepResult,
    DtConvergenceResult,
    DtSweepPoint,
    run_amplitude_sweep,
    run_dt_convergence,
)
from adcs_core.analysis.trim import TrimResult, compute_level_trim, compute_level_trim_guess
from adcs_core.control.gain_schedule import GainSchedule, build_gain_schedule
from adcs_core.control.gain_scheduling import GainSchedule1D, ScheduledPIDGains
from adcs_core.control.lqr import LQRController, lqr
from adcs_core.dynamics.integrator import rk4_step
from adcs_core.dynamics.linearize import LinearizationPoint, finite_difference_jacobian, linearize, select_subsystem
from adcs_core.model import xdot_full
from adcs_core.state.state_definition import (
    ANGLE_INDICES,
    CONTROL_ORDER,
    DYNAMIC_STATE_ORDER,
    ControlIndex,
    DynamicStateIndex,
    POSITION_INDICES,
    RATE_INDICES,
    StateIndex,
    STATE_ORDER,
    VELOCITY_INDICES,
)
from adcs_core.state.state_vector import State

__all__ = [
    "ANGLE_INDICES",
    "ActuatorLimits",
    "AircraftModel",
    "AircraftParameters",
    "AmplitudeSweepPoint",
    "AmplitudeSweepResult",
    "CONTROL_ORDER",
    "ControlIndex",
    "ControlInputs",
    "DYNAMIC_STATE_ORDER",
    "DynamicStateIndex",
    "DtConvergenceResult",
    "DtSweepPoint",
    "GainSchedule1D",
    "JacobianValidationResult",
    "LONGITUDINAL_INPUT_IDX_FULL",
    "LONGITUDINAL_STATE_IDX_FULL",
    "LQRController",
    "LinearModePrediction",
    "LinearizationPoint",
    "LongitudinalLqrDesign",
    "LongitudinalResponseMetrics",
    "ModalAnalysisResult",
    "ModalFidelityResult",
    "ModeSummary",
    "NonlinearModeEstimate",
    "OpenClosedResponseComparison",
    "POSITION_INDICES",
    "RATE_INDICES",
    "STATE_ORDER",
    "GainSchedule",
    "ScheduledPIDGains",
    "State",
    "StateIndex",
    "TrimResult",
    "UnstableGrowthEstimate",
    "VELOCITY_INDICES",
    "analyze_modal_structure",
    "build_gain_schedule",
    "compare_open_closed_longitudinal_response",
    "compute_level_trim",
    "compute_level_trim_guess",
    "design_longitudinal_lqr",
    "estimate_unstable_growth_rate",
    "finite_difference_jacobian",
    "get_aircraft_model",
    "linear_prediction_from_eigenvalue",
    "linearize",
    "lqr",
    "modal_table",
    "rk4_step",
    "run_amplitude_sweep",
    "run_dt_convergence",
    "select_longitudinal_complex_mode",
    "select_subsystem",
    "simulate_longitudinal_perturbation",
    "validate_jacobian",
    "validate_modal_fidelity",
    "xdot_full",
]
