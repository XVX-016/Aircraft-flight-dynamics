from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class AttitudeComplementaryFilter:
    """
    Simple complementary filter for roll/pitch from gyro + accelerometer and yaw from compass.

    Not yet wired into the autopilot loop but provided as an interview-grade
    hook for estimator-based architectures:

      - use IMU specific force to infer gravity direction -> roll/pitch
      - blend with integrated gyro using a high-pass/low-pass split
      - yaw from compass heading (could also be fused with gyro z)
    """

    alpha: float = 0.98  # gyro weight in [0,1]

    phi: float = 0.0
    theta: float = 0.0
    psi: float = 0.0

    def reset(self, phi: float = 0.0, theta: float = 0.0, psi: float = 0.0) -> None:
        self.phi = float(phi)
        self.theta = float(theta)
        self.psi = float(psi)

    def update(self, dt: float, p: float, q: float, r: float, ax: float, ay: float, az: float, heading_rad: float) -> tuple[float, float, float]:
        if dt <= 0.0:
            return self.phi, self.theta, self.psi

        # integrate gyro
        phi_gyro = self.phi + dt * (p + np.sin(self.phi) * np.tan(self.theta) * q + np.cos(self.phi) * np.tan(self.theta) * r)
        theta_gyro = self.theta + dt * (np.cos(self.phi) * q - np.sin(self.phi) * r)
        psi_gyro = self.psi + dt * (np.sin(self.phi) / np.cos(self.theta) * q + np.cos(self.phi) / np.cos(self.theta) * r)

        # accel-based roll/pitch (assuming ax,ay,az ~ -g along body-z when level)
        g = np.sqrt(ax * ax + ay * ay + az * az) + 1e-9
        axn, ayn, azn = ax / g, ay / g, az / g
        theta_acc = float(np.arctan2(-axn, np.sqrt(ayn * ayn + azn * azn)))
        phi_acc = float(np.arctan2(ayn, azn))

        self.phi = self.alpha * phi_gyro + (1.0 - self.alpha) * phi_acc
        self.theta = self.alpha * theta_gyro + (1.0 - self.alpha) * theta_acc
        self.psi = float(heading_rad)

        return self.phi, self.theta, self.psi


