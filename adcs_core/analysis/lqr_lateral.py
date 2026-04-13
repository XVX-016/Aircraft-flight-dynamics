from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import linalg

from adcs_core.state.state_definition import ControlIndex, StateIndex


LATERAL_STATE_IDX_FULL = [
    int(StateIndex.V),
    int(StateIndex.P),
    int(StateIndex.R),
    int(StateIndex.PHI),
]
LATERAL_INPUT_IDX_FULL = [
    int(ControlIndex.AILERON),
    int(ControlIndex.RUDDER),
]


@dataclass(frozen=True)
class LateralLqrDesign:
    """
    Result of a lateral-directional LQR design.
    """
    A_lat: np.ndarray
    B_lat: np.ndarray
    K: np.ndarray
    controllability_rank: int
    controllability_condition: float
    open_loop_eigenvalues: np.ndarray
    closed_loop_eigenvalues: np.ndarray
    max_real_open: float
    max_real_closed: float
    Q: np.ndarray
    R: np.ndarray


class LateralLqrDesigner:
    """
    Designer class for lateral-directional LQR stabilization.
    """
    def __init__(self, A_lat: np.ndarray, B_lat: np.ndarray):
        """
        Initialize with extracted lateral subsystem matrices.
        
        Args:
            A_lat: 4x4 lateral state matrix [v, p, r, phi]
            B_lat: 4x2 lateral control matrix [aileron, rudder]
        """
        self.A_lat = np.asarray(A_lat, dtype=float)
        self.B_lat = np.asarray(B_lat, dtype=float)

    def design(self, Q: np.ndarray | None = None, R: np.ndarray | None = None) -> LateralLqrDesign:
        """
        Solve the LQR problem for the lateral subsystem.
        
        Args:
            Q: 4x4 state penalty matrix. Default penalizes bank angle and yaw damping.
            R: 2x2 control penalty matrix. Default is balanced effort.
        
        Returns:
            LateralLqrDesign containing results and gain matrix K.
        """
        Qeff = np.diag([1.0, 10.0, 10.0, 50.0]) if Q is None else np.asarray(Q, dtype=float)
        Reff = np.diag([1.0, 1.0]) if R is None else np.asarray(R, dtype=float)

        # Controllability check
        n = self.A_lat.shape[0]
        C = np.hstack([np.linalg.matrix_power(self.A_lat, i) @ self.B_lat for i in range(n)])
        rank = int(np.linalg.matrix_rank(C))
        cond = float(np.linalg.cond(C))
        
        if rank < n:
            raise RuntimeError(f"Lateral subsystem not controllable: rank={rank}, n={n}")

        # Solve Continuous Algebraic Riccati Equation
        P = linalg.solve_continuous_are(self.A_lat, self.B_lat, Qeff, Reff)
        K = np.linalg.solve(Reff, self.B_lat.T @ P)

        eig_open = np.linalg.eigvals(self.A_lat)
        eig_closed = np.linalg.eigvals(self.A_lat - self.B_lat @ K)
        
        return LateralLqrDesign(
            A_lat=self.A_lat,
            B_lat=self.B_lat,
            K=K,
            controllability_rank=rank,
            controllability_condition=cond,
            open_loop_eigenvalues=eig_open,
            closed_loop_eigenvalues=eig_closed,
            max_real_open=float(np.max(np.real(eig_open))),
            max_real_closed=float(np.max(np.real(eig_closed))),
            Q=Qeff,
            R=Reff,
        )

    def check_stability(self, A_lat: np.ndarray, B_lat: np.ndarray, K: np.ndarray) -> tuple[np.ndarray, bool]:
        """
        Confirm eigenvalues of (A - B*K) have negative real parts.
        
        Returns:
            tuple: (eigenvalues, is_stable)
        """
        eig = np.linalg.eigvals(A_lat - B_lat @ K)
        is_stable = bool(np.all(np.real(eig) < 0))
        return eig, is_stable


def extract_lateral_subsystem(
    A_full: np.ndarray,
    B_full: np.ndarray,
    state_indices: list[int] = LATERAL_STATE_IDX_FULL,
    input_indices: list[int] = LATERAL_INPUT_IDX_FULL,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Extract the lateral subsystem from full 12-state matrices.
    Default indices for [v, p, r, phi] and [aileron, rudder] are provided.
    """
    A = np.asarray(A_full, dtype=float)
    B = np.asarray(B_full, dtype=float)
    A_lat = A[np.ix_(state_indices, state_indices)]
    B_lat = B[np.ix_(state_indices, input_indices)]
    return A_lat, B_lat


def design_lateral_lqr(
    A_full: np.ndarray,
    B_full: np.ndarray,
    *,
    Q: np.ndarray | None = None,
    R: np.ndarray | None = None,
) -> LateralLqrDesign:
    """
    Convenience function matching the API of design_longitudinal_lqr.
    """
    A_lat, B_lat = extract_lateral_subsystem(
        A_full,
        B_full,
        state_indices=LATERAL_STATE_IDX_FULL,
        input_indices=LATERAL_INPUT_IDX_FULL,
    )
    designer = LateralLqrDesigner(A_lat, B_lat)
    return designer.design(Q=Q, R=R)
