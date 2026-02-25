from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Tuple

import numpy as np


@dataclass
class EKF:
    """
    Minimal EKF scaffold:
      x_{k+1} = f(x_k, u_k) + w
      z_k     = h(x_k) + v

    This base class is generic; provide f/F and h/H via callables.
    """

    x: np.ndarray  # (n,)
    P: np.ndarray  # (n,n)
    Q: np.ndarray  # (n,n)

    def __post_init__(self) -> None:
        self.x = np.asarray(self.x, dtype=float).reshape(-1)
        self.P = np.asarray(self.P, dtype=float)
        self.Q = np.asarray(self.Q, dtype=float)

    def predict(self, f, F, u: np.ndarray, dt: float) -> None:
        u = np.asarray(u, dtype=float).reshape(-1)
        self.x = np.asarray(f(self.x, u, dt), dtype=float).reshape(-1)
        A = np.asarray(F(self.x, u, dt), dtype=float)
        self.P = A @ self.P @ A.T + self.Q

    def update(self, z: np.ndarray, h, H, R: np.ndarray) -> Dict[str, np.ndarray]:
        z = np.asarray(z, dtype=float).reshape(-1)
        R = np.asarray(R, dtype=float)

        zhat = np.asarray(h(self.x), dtype=float).reshape(-1)
        C = np.asarray(H(self.x), dtype=float)

        y = z - zhat  # innovation
        S = C @ self.P @ C.T + R
        K = self.P @ C.T @ np.linalg.inv(S)
        self.x = self.x + K @ y
        I = np.eye(self.P.shape[0])
        self.P = (I - K @ C) @ self.P

        # NIS (normalized innovation squared)
        nis = float(y.T @ np.linalg.inv(S) @ y)
        return {"innovation": y, "S": S, "K": K, "nis": np.array([nis])}


@dataclass
class AttitudeEKF:
    """
    A small, interview-friendly EKF for [phi, theta, psi] using:
      - gyro rates as inputs u=[p,q,r]
      - measurements z=[heading] (compass), optionally [phi,theta] pseudo-measurements

    This is intentionally minimal and stable for demo/portfolio purposes.
    """

    x: np.ndarray = field(default_factory=lambda: np.zeros(3))  # [phi, theta, psi]
    P: np.ndarray = field(default_factory=lambda: np.diag([1e-2, 1e-2, 5e-2]))
    Q: np.ndarray = field(default_factory=lambda: np.diag([1e-5, 1e-5, 2e-5]))

    def __post_init__(self) -> None:
        self.ekf = EKF(self.x, self.P, self.Q)

    @staticmethod
    def f(x: np.ndarray, u: np.ndarray, dt: float) -> np.ndarray:
        phi, theta, psi = x
        p, q, r = u
        cth = np.cos(theta)
        if abs(cth) < 1e-6:
            cth = 1e-6 * np.sign(cth if cth != 0.0 else 1.0)
        tth = np.tan(theta)
        sphi, cphi = np.sin(phi), np.cos(phi)

        phi_dot = p + sphi * tth * q + cphi * tth * r
        theta_dot = cphi * q - sphi * r
        psi_dot = (sphi / cth) * q + (cphi / cth) * r
        return np.array([phi + dt * phi_dot, theta + dt * theta_dot, psi + dt * psi_dot], dtype=float)

    @staticmethod
    def F(x: np.ndarray, u: np.ndarray, dt: float) -> np.ndarray:
        # finite difference Jacobian for simplicity
        eps = 1e-6
        A = np.zeros((3, 3), dtype=float)
        for i in range(3):
            dx = np.zeros(3)
            dx[i] = eps
            fp = AttitudeEKF.f(x + dx, u, dt)
            fm = AttitudeEKF.f(x - dx, u, dt)
            A[:, i] = (fp - fm) / (2 * eps)
        return A

    @staticmethod
    def h_heading(x: np.ndarray) -> np.ndarray:
        return np.array([x[2]], dtype=float)

    @staticmethod
    def H_heading(x: np.ndarray) -> np.ndarray:
        return np.array([[0.0, 0.0, 1.0]], dtype=float)

    def predict(self, p: float, q: float, r: float, dt: float) -> None:
        self.ekf.predict(self.f, self.F, np.array([p, q, r], dtype=float), dt)

    def update_heading(self, heading_rad: float, R_heading: float = 0.05**2) -> Dict[str, np.ndarray]:
        return self.ekf.update(np.array([heading_rad], dtype=float), self.h_heading, self.H_heading, np.array([[R_heading]], dtype=float))

    @property
    def state(self) -> np.ndarray:
        return self.ekf.x


