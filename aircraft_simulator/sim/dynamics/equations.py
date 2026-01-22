from __future__ import annotations

import numpy as np

from aircraft_simulator.sim.aircraft.parameters import AircraftParameters
from aircraft_simulator.sim.state import State


def _wrap_angle(a: float) -> float:
    # keep angles bounded (for logging/readability)
    return float((a + np.pi) % (2.0 * np.pi) - np.pi)


def rotation_body_to_inertial(phi: float, theta: float, psi: float) -> np.ndarray:
    """
    Direction cosine matrix from body to inertial (3-2-1 yaw-pitch-roll).
    """
    cphi, sphi = np.cos(phi), np.sin(phi)
    cth, sth = np.cos(theta), np.sin(theta)
    cpsi, spsi = np.cos(psi), np.sin(psi)

    # body->inertial
    return np.array(
        [
            [cth * cpsi, sphi * sth * cpsi - cphi * spsi, cphi * sth * cpsi + sphi * spsi],
            [cth * spsi, sphi * sth * spsi + cphi * cpsi, cphi * sth * spsi - sphi * cpsi],
            [-sth, sphi * cth, cphi * cth],
        ],
        dtype=float,
    )


def euler_rates_from_body_rates(phi: float, theta: float, p: float, q: float, r: float) -> np.ndarray:
    """
    [phi_dot, theta_dot, psi_dot]^T = T(phi,theta) * [p,q,r]^T
    """
    cth = np.cos(theta)
    if abs(cth) < 1e-6:
        cth = 1e-6 * np.sign(cth if cth != 0.0 else 1.0)
    tth = np.tan(theta)
    sphi, cphi = np.sin(phi), np.cos(phi)

    T = np.array(
        [
            [1.0, sphi * tth, cphi * tth],
            [0.0, cphi, -sphi],
            [0.0, sphi / cth, cphi / cth],
        ],
        dtype=float,
    )
    return T @ np.array([p, q, r], dtype=float)


def derivatives_6dof(
    t: float,
    x: np.ndarray,
    params: AircraftParameters,
    forces_b_N: np.ndarray,
    moments_b_Nm: np.ndarray,
) -> np.ndarray:
    """
    State x = [pos(3), vel_b(3), euler(3), rates_b(3)].

    forces_b are applied forces in BODY axes [N].
    moments_b are applied moments in BODY axes [N*m].
    """
    s = State.from_vector(x)

    m = params.mass_kg
    g = params.g_ms2
    I = params.inertia_kgm2
    Iinv = np.linalg.inv(I)

    # --- kinematics: position derivative from body velocity ---
    C_bi = rotation_body_to_inertial(s.phi, s.theta, s.psi)
    vel_i = C_bi @ np.array([s.u, s.v, s.w], dtype=float)

    # --- dynamics: body translational acceleration ---
    omega = np.array([s.p, s.q, s.r], dtype=float)
    v_b = np.array([s.u, s.v, s.w], dtype=float)

    # gravity expressed in inertial then rotated to body
    g_i = np.array([0.0, 0.0, g], dtype=float)  # NED: z is down
    g_b = C_bi.T @ g_i

    a_b = (forces_b_N / m) + g_b - np.cross(omega, v_b)

    # --- attitude: Euler angle rates ---
    eul_dot = euler_rates_from_body_rates(s.phi, s.theta, s.p, s.q, s.r)

    # --- rotational dynamics ---
    omega_dot = Iinv @ (moments_b_Nm - np.cross(omega, I @ omega))

    dx = np.zeros(12, dtype=float)
    dx[0:3] = vel_i
    dx[3:6] = a_b
    dx[6:9] = eul_dot
    dx[9:12] = omega_dot

    return dx


def post_step_sanitize(x: np.ndarray) -> np.ndarray:
    """
    Keep Euler angles wrapped for nicer logs and to avoid unbounded growth.
    """
    y = np.array(x, dtype=float, copy=True)
    y[6] = _wrap_angle(float(y[6]))
    y[7] = _wrap_angle(float(y[7]))
    y[8] = _wrap_angle(float(y[8]))
    return y


