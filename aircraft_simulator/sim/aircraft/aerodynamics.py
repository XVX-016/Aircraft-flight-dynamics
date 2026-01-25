from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import numpy as np

from aircraft_simulator.sim.aircraft.parameters import AircraftParameters, qbar
from aircraft_simulator.sim.state import State


@dataclass(frozen=True)
class ControlInputs:
    """
    Normalized/physical control inputs.
    - throttle: 0..1
    - aileron/elevator/rudder: radians
    """

    throttle: float = 0.0
    aileron: float = 0.0
    elevator: float = 0.0
    rudder: float = 0.0


@dataclass(frozen=True)
class AeroCoefficients:
    CL: float
    CD: float
    CY: float
    Cl: float
    Cm: float
    Cn: float


def _alpha_beta_from_body_vel(u: float, v: float, w: float) -> Tuple[float, float, float]:
    V = float(np.sqrt(u * u + v * v + w * w))
    V = max(V, 1e-3)
    alpha = float(np.arctan2(w, u))  # w positive down (NED/body)
    beta = float(np.arcsin(np.clip(v / V, -0.999, 0.999)))
    return alpha, beta, V


def wind_to_body(alpha: float, beta: float) -> np.ndarray:
    """
    Transform vector in wind axes to body axes.
    Wind axes: X along V, Z down, Y right.
    Body axes: x forward, z down, y right.
    """
    ca, sa = np.cos(alpha), np.sin(alpha)
    cb, sb = np.cos(beta), np.sin(beta)

    # Inverse of body->wind (Rz(beta) then Ry(alpha))
    # wind->body = Ry(-alpha) * Rz(-beta)
    Ry_ma = np.array([[ca, 0.0, -sa], [0.0, 1.0, 0.0], [sa, 0.0, ca]], dtype=float)
    Rz_mb = np.array([[cb, sb, 0.0], [-sb, cb, 0.0], [0.0, 0.0, 1.0]], dtype=float)
    return Ry_ma @ Rz_mb


def compute_coefficients(
    state: State, controls: ControlInputs, params: AircraftParameters
) -> Tuple[AeroCoefficients, float, float, float]:
    """
    Returns (coeffs, alpha, beta, V).
    """
    alpha, beta, V = _alpha_beta_from_body_vel(state.u, state.v, state.w)

    # Nondimensional rates
    p_hat = state.p * params.b_m / (2.0 * V)
    q_hat = state.q * params.cbar_m / (2.0 * V)
    r_hat = state.r * params.b_m / (2.0 * V)

    CL = params.CL0 + params.CL_alpha_per_rad * alpha + params.CL_de_per_rad * controls.elevator
    CD = params.CD0 + params.CD_k * (CL * CL)
    CY = params.CY_beta_per_rad * beta + params.CY_dr_per_rad * controls.rudder

    Cm = (
        params.Cm0
        + params.Cm_alpha_per_rad * alpha
        + params.Cm_q_per_rad * q_hat
        + params.Cm_de_per_rad * controls.elevator
    )

    Cl = (
        params.Cl_beta_per_rad * beta
        + params.Cl_p * p_hat
        + params.Cl_r * r_hat
        + params.Cl_da_per_rad * controls.aileron
        + params.Cl_dr_per_rad * controls.rudder
    )

    Cn = (
        params.Cn_beta_per_rad * beta
        + params.Cn_p * p_hat
        + params.Cn_r * r_hat
        + params.Cn_da_per_rad * controls.aileron
        + params.Cn_dr_per_rad * controls.rudder
    )

    return AeroCoefficients(CL=CL, CD=CD, CY=CY, Cl=Cl, Cm=Cm, Cn=Cn), alpha, beta, V


def compute_coefficients_from_body_vel(
    u: float,
    v: float,
    w: float,
    *,
    p: float,
    q: float,
    r: float,
    controls: ControlInputs,
    params: AircraftParameters,
) -> Tuple[AeroCoefficients, float, float, float]:
    """
    Same as compute_coefficients, but driven by explicit body-relative (air-relative) velocity.
    Use this when wind is present.
    """
    alpha, beta, V = _alpha_beta_from_body_vel(u, v, w)

    p_hat = p * params.b_m / (2.0 * V)
    q_hat = q * params.cbar_m / (2.0 * V)
    r_hat = r * params.b_m / (2.0 * V)

    CL = params.CL0 + params.CL_alpha_per_rad * alpha + params.CL_de_per_rad * controls.elevator
    CD = params.CD0 + params.CD_k * (CL * CL)
    CY = params.CY_beta_per_rad * beta + params.CY_dr_per_rad * controls.rudder

    Cm = (
        params.Cm0
        + params.Cm_alpha_per_rad * alpha
        + params.Cm_q_per_rad * q_hat
        + params.Cm_de_per_rad * controls.elevator
    )

    Cl = (
        params.Cl_beta_per_rad * beta
        + params.Cl_p * p_hat
        + params.Cl_r * r_hat
        + params.Cl_da_per_rad * controls.aileron
        + params.Cl_dr_per_rad * controls.rudder
    )

    Cn = (
        params.Cn_beta_per_rad * beta
        + params.Cn_p * p_hat
        + params.Cn_r * r_hat
        + params.Cn_da_per_rad * controls.aileron
        + params.Cn_dr_per_rad * controls.rudder
    )

    return AeroCoefficients(CL=CL, CD=CD, CY=CY, Cl=Cl, Cm=Cm, Cn=Cn), alpha, beta, V


def compute_aero_forces_moments_body(
    state: State, controls: ControlInputs, params: AircraftParameters
) -> Tuple[np.ndarray, np.ndarray, dict]:
    """
    Returns (forces_body_N, moments_body_Nm, debug).
    Aerodynamic forces are computed in wind axes then transformed to body axes.
    """
    coeffs, alpha, beta, V = compute_coefficients(state, controls, params)
    q = qbar(params.rho_kgm3, V)

    L = q * params.S_m2 * coeffs.CL
    D = q * params.S_m2 * coeffs.CD
    Y = q * params.S_m2 * coeffs.CY

    # Wind axes (X along V, Z down). Lift is UP => negative Z_wind.
    F_wind = np.array([-D, Y, -L], dtype=float)
    F_body = wind_to_body(alpha, beta) @ F_wind

    # Moments in body axes
    Lb = q * params.S_m2 * params.b_m * coeffs.Cl
    Mb = q * params.S_m2 * params.cbar_m * coeffs.Cm
    Nb = q * params.S_m2 * params.b_m * coeffs.Cn
    M_body = np.array([Lb, Mb, Nb], dtype=float)

    debug = {
        "V": V,
        "alpha": alpha,
        "beta": beta,
        "CL": coeffs.CL,
        "CD": coeffs.CD,
        "CY": coeffs.CY,
        "Cl": coeffs.Cl,
        "Cm": coeffs.Cm,
        "Cn": coeffs.Cn,
        "qbar": q,
        "L_N": L,
        "D_N": D,
        "Y_N": Y,
    }
    return F_body, M_body, debug


def compute_aero_forces_moments_body_from_air_vel(
    *,
    uvw_air_mps: np.ndarray,
    pqr_radps: np.ndarray,
    controls: ControlInputs,
    params: AircraftParameters,
) -> Tuple[np.ndarray, np.ndarray, dict]:
    """
    Aerodynamic forces/moments using explicit air-relative body velocity (wind already subtracted).
    """
    u, v, w = [float(x) for x in np.asarray(uvw_air_mps, dtype=float).reshape(3)]
    p, q, r = [float(x) for x in np.asarray(pqr_radps, dtype=float).reshape(3)]
    coeffs, alpha, beta, V = compute_coefficients_from_body_vel(u, v, w, p=p, q=q, r=r, controls=controls, params=params)
    qd = qbar(params.rho_kgm3, V)

    L = qd * params.S_m2 * coeffs.CL
    D = qd * params.S_m2 * coeffs.CD
    Y = qd * params.S_m2 * coeffs.CY

    F_wind = np.array([-D, Y, -L], dtype=float)
    F_body = wind_to_body(alpha, beta) @ F_wind

    Lb = qd * params.S_m2 * params.b_m * coeffs.Cl
    Mb = qd * params.S_m2 * params.cbar_m * coeffs.Cm
    Nb = qd * params.S_m2 * params.b_m * coeffs.Cn
    M_body = np.array([Lb, Mb, Nb], dtype=float)

    debug = {
        "V": V,
        "alpha": alpha,
        "beta": beta,
        "CL": coeffs.CL,
        "CD": coeffs.CD,
        "CY": coeffs.CY,
        "Cl": coeffs.Cl,
        "Cm": coeffs.Cm,
        "Cn": coeffs.Cn,
        "qbar": qd,
        "L_N": L,
        "D_N": D,
        "Y_N": Y,
    }
    return F_body, M_body, debug


