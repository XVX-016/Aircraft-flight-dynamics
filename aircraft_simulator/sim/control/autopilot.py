from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

import numpy as np

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.control.pid import PID


def wrap_pi(a: float) -> float:
    return float((a + np.pi) % (2.0 * np.pi) - np.pi)


@dataclass(frozen=True)
class AutopilotTargets:
    airspeed_mps: float = 35.0
    altitude_m: float = 1000.0
    heading_rad: float = 0.0


@dataclass
class AutopilotGains:
    # outer loops
    airspeed: tuple[float, float, float] = (0.08, 0.02, 0.00)  # throttle
    altitude: tuple[float, float, float] = (0.008, 0.0015, 0.00)  # outputs pitch cmd
    heading: tuple[float, float, float] = (1.2, 0.0, 0.15)  # outputs bank cmd

    # inner loops
    pitch: tuple[float, float, float] = (2.5, 0.3, 0.25)  # outputs elevator
    roll: tuple[float, float, float] = (3.0, 0.15, 0.2)  # outputs aileron
    yaw_damper: tuple[float, float, float] = (0.3, 0.0, 0.0)  # outputs rudder


@dataclass(frozen=True)
class AutopilotLimits:
    throttle_min: float = 0.0
    throttle_max: float = 1.0
    theta_cmd_max_rad: float = np.deg2rad(20.0)
    phi_cmd_max_rad: float = np.deg2rad(35.0)

    elevator_max_rad: float = np.deg2rad(25.0)
    aileron_max_rad: float = np.deg2rad(20.0)
    rudder_max_rad: float = np.deg2rad(30.0)


class Autopilot:
    """
    Phase 2 PID autopilot:
      - Airspeed hold -> throttle
      - Altitude hold -> pitch command -> elevator
      - Heading hold -> bank command -> aileron
      - Simple yaw damper -> rudder
    """

    def __init__(self, gains: AutopilotGains | None = None, limits: AutopilotLimits | None = None):
        self.gains = gains or AutopilotGains()
        self.limits = limits or AutopilotLimits()

        self.pid_V = PID(*self.gains.airspeed, u_min=self.limits.throttle_min, u_max=self.limits.throttle_max)
        self.pid_h = PID(*self.gains.altitude, u_min=-self.limits.theta_cmd_max_rad, u_max=self.limits.theta_cmd_max_rad)
        self.pid_psi = PID(*self.gains.heading, u_min=-self.limits.phi_cmd_max_rad, u_max=self.limits.phi_cmd_max_rad)

        self.pid_theta = PID(*self.gains.pitch, u_min=-self.limits.elevator_max_rad, u_max=self.limits.elevator_max_rad)
        self.pid_phi = PID(*self.gains.roll, u_min=-self.limits.aileron_max_rad, u_max=self.limits.aileron_max_rad)
        self.pid_r = PID(*self.gains.yaw_damper, u_min=-self.limits.rudder_max_rad, u_max=self.limits.rudder_max_rad)

    def reset(self) -> None:
        for pid in [self.pid_V, self.pid_h, self.pid_psi, self.pid_theta, self.pid_phi, self.pid_r]:
            pid.reset()

    def update(self, sensors: Dict[str, float], targets: AutopilotTargets, dt: float) -> tuple[ControlInputs, Dict[str, float]]:
        # --- airspeed -> throttle ---
        V = float(sensors["airspeed_mps"])
        throttle = self.pid_V.update(V, targets.airspeed_mps, dt)

        # --- altitude -> pitch command ---
        alt = float(sensors["altitude_m"])
        theta_cmd = self.pid_h.update(alt, targets.altitude_m, dt)

        # --- pitch command -> elevator ---
        theta = float(sensors["theta_rad"])
        elevator = self.pid_theta.update(theta, theta_cmd, dt)

        # --- heading -> bank command ---
        psi = float(sensors["heading_rad"])
        psi_err = wrap_pi(targets.heading_rad - psi)
        # use pid on error directly for better wrap behavior
        bank_cmd = self.pid_psi.update(0.0, psi_err, dt)

        # --- bank command -> aileron ---
        phi = float(sensors["phi_rad"])
        aileron = self.pid_phi.update(phi, bank_cmd, dt)

        # --- yaw damper: r -> rudder ---
        r = float(sensors["r_radps"])
        rudder = self.pid_r.update(r, 0.0, dt)

        debug = {
            "V": V,
            "alt": alt,
            "psi": psi,
            "theta_cmd": theta_cmd,
            "bank_cmd": bank_cmd,
            "psi_err": psi_err,
            "throttle_cmd": throttle,
            "elevator_cmd": elevator,
            "aileron_cmd": aileron,
            "rudder_cmd": rudder,
        }

        return ControlInputs(throttle=throttle, aileron=aileron, elevator=elevator, rudder=rudder), debug


