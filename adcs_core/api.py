from __future__ import annotations

import numpy as np

from adcs_core.analysis.lqr_longitudinal import LongitudinalLqrDesign, design_longitudinal_lqr
from adcs_core.analysis.modal_analysis import ModalAnalysisResult, analyze_modal_structure
from adcs_core.analysis.trim import TrimResult, compute_level_trim
from adcs_core.dynamics.integrator import rk4_step
from adcs_core.dynamics.linearize import linearize
from adcs_core.model import xdot_full
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
