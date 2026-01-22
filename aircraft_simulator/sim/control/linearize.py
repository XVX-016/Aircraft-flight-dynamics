from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable, Sequence, Tuple

import numpy as np


@dataclass(frozen=True)
class LinearizationPoint:
    """
    Operating point for linearization.
    x0: full state vector (n,)
    u0: control vector (m,)
    """

    x0: np.ndarray
    u0: np.ndarray


def finite_difference_jacobian(
    f: Callable[[np.ndarray], np.ndarray],
    x0: np.ndarray,
    eps: float = 1e-5,
) -> np.ndarray:
    """
    Central finite-difference Jacobian of f at x0.
    f: R^n -> R^p
    Returns J: (p, n)
    """
    x0 = np.asarray(x0, dtype=float).reshape(-1)
    y0 = np.asarray(f(x0), dtype=float).reshape(-1)
    n = x0.size
    p = y0.size
    J = np.zeros((p, n), dtype=float)
    for i in range(n):
        dx = np.zeros(n)
        dx[i] = eps
        yp = np.asarray(f(x0 + dx), dtype=float).reshape(-1)
        ym = np.asarray(f(x0 - dx), dtype=float).reshape(-1)
        J[:, i] = (yp - ym) / (2.0 * eps)
    return J


def linearize(
    f: Callable[[np.ndarray, np.ndarray], np.ndarray],
    x0: np.ndarray,
    u0: np.ndarray,
    *,
    eps_x: float = 1e-5,
    eps_u: float = 1e-5,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Linearize nonlinear dynamics xdot = f(x,u) about (x0,u0).
    Returns (A,B).
    """
    x0 = np.asarray(x0, dtype=float).reshape(-1)
    u0 = np.asarray(u0, dtype=float).reshape(-1)

    A = finite_difference_jacobian(lambda x: f(x, u0), x0, eps=eps_x)
    B = finite_difference_jacobian(lambda u: f(x0, u), u0, eps=eps_u)
    return A, B


def select_subsystem(
    A: np.ndarray,
    B: np.ndarray,
    *,
    state_idx: Sequence[int],
    input_idx: Sequence[int],
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Extract reduced-order (A_sub, B_sub).
    """
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    state_idx = list(state_idx)
    input_idx = list(input_idx)
    A_sub = A[np.ix_(state_idx, state_idx)]
    B_sub = B[np.ix_(state_idx, input_idx)]
    return A_sub, B_sub


