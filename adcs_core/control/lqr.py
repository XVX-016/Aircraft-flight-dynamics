from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Tuple

import numpy as np

try:  # optional dependency; PID-only usage should still work without it
    from control import lqr as _lqr  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover - exercised only when control is missing
    _lqr = None


def lqr(A: np.ndarray, B: np.ndarray, Q: np.ndarray, R: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Thin wrapper around python-control's lqr() returning (K, S, E) with numpy arrays.
    This is intentionally small: we do not hard-wire a specific airframe trim here.
    """
    if _lqr is None:
        raise RuntimeError("python-control is not installed; install 'control' to use LQR utilities.")
    K, S, E = _lqr(A, B, Q, R)
    return np.asarray(K), np.asarray(S), np.asarray(E)


@dataclass
class LQRController:
    """
    Generic state-feedback controller:
        u = u_trim - K @ (x - x_trim)
    """

    K: np.ndarray  # shape (m, n)
    x_trim: np.ndarray  # shape (n,)
    u_trim: np.ndarray  # shape (m,)

    def __post_init__(self) -> None:
        self.K = np.asarray(self.K, dtype=float)
        self.x_trim = np.asarray(self.x_trim, dtype=float).reshape(-1)
        self.u_trim = np.asarray(self.u_trim, dtype=float).reshape(-1)
        if self.K.shape[1] != self.x_trim.size:
            raise ValueError("K and x_trim dimension mismatch")
        if self.K.shape[0] != self.u_trim.size:
            raise ValueError("K and u_trim dimension mismatch")

    def __call__(self, x: Iterable[float], x_ref: Iterable[float] | None = None) -> np.ndarray:
        x = np.asarray(list(x), dtype=float).reshape(-1)
        if x.size != self.x_trim.size:
            raise ValueError("x dimension mismatch")
        if x_ref is None:
            x_ref_vec = self.x_trim
        else:
            x_ref_vec = np.asarray(list(x_ref), dtype=float).reshape(-1)
            if x_ref_vec.size != self.x_trim.size:
                raise ValueError("x_ref dimension mismatch")
        dx = x - x_ref_vec
        return self.u_trim - self.K @ dx


