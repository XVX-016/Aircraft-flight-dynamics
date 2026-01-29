import { TruthState, Vector3 } from "../types/state";
import { AircraftConfig } from "../types/aircraft";
import { ControlInput } from "../types/control";
import { Vec3 } from "./math-utils";

const RHO = 1.225; // Standard sea level density (kg/m^3)

/**
 * Calculate Aerodynamic Forces and Moments in BODY FRAME
 */
export function calculateAerodynamics(
    state: TruthState,
    config: AircraftConfig,
    controls: ControlInput
): { forces: Vector3, moments: Vector3 } {
    const { aero, geometry } = config;
    const S = geometry.wingArea;
    const b = geometry.wingSpan;
    const c = geometry.chord;

    // Airspeed (Va)
    const Va = Vec3.mag(state.v);
    if (Va < 0.1) {
        return { forces: { x: 0, y: 0, z: 0 }, moments: { x: 0, y: 0, z: 0 } };
    }

    // Dynamic Pressure (q_bar)
    const q_bar = 0.5 * RHO * Va * Va;

    // Airflow Angles
    // alpha = atan2(w, u)
    // beta = asin(v / Va)
    const alpha = state.alpha; // Assumed pre-calculated in state update or calculated here?
    // Let's rely on state.alpha if it is up to date, otherwise:
    // const alpha = Math.atan2(state.v.z, state.v.x);
    const beta = state.beta;

    // Normalized angular rates (p_hat, q_hat, r_hat)
    // p_hat = p * b / (2 * Va)
    const p_hat = (state.w.x * b) / (2 * Va);
    const q_hat = (state.w.y * c) / (2 * Va); // Note: use chord for pitch
    const r_hat = (state.w.z * b) / (2 * Va);

    // Control Deflections (radians)
    // Map -1..1 input to min/max angles
    const de = controls.elevator * (controls.elevator > 0 ? config.controls.elevatorMax : -config.controls.elevatorMin) * -1; // Pitch up (negative de usually?) Convention: Pull back (+1) -> Elevator Up (-deflection) -> Pitch Up moment. 
    // Wait, standard convention: +elevator deflection -> negative moment (pitch down).
    // Let's stick to: Pull (+1) -> Pitch Up (+My). 
    // We will apply the sign in the coefficient or deflection.
    // Usually: +de is trailing edge down. Pulling stick -> trailing edge UP -> -de.
    // Let's map stick input (+1) to "Pitch Up Action".
    // If Cm_de is negative, then verify sign.

    // Simplification:
    // controls.elevator (+1) => Pitch Up.
    // controls.aileron (+1) => Roll Right.
    // controls.rudder (+1) => Yaw Right.

    const de_eff = controls.elevator * config.controls.elevatorMax; // Simplified mapping
    const da_eff = controls.aileron * config.controls.aileronMax;
    const dr_eff = controls.rudder * config.controls.rudderMax;


    // 1. Lift Coefficient (CL)
    // Linear approximation
    const CL = aero.CL0 +
        aero.CL_alpha * alpha +
        aero.CL_q * q_hat +
        aero.CL_de * controls.elevator; // Using normalized input for simplicity or angle? 
    // The coefficients in `default_aircraft.json` seem to expect angles? 
    // CL_alpha = 4.5 (per rad). de max = 0.5 rad. CL_de = 0.4.
    // Let's use angles for consistency with alpha.
    const CL_total = aero.CL0 + aero.CL_alpha * alpha + aero.CL_q * q_hat + aero.CL_de * de_eff;

    // 2. Drag Coefficient (CD)
    // Simple polar: CD = CD0 + k * CL^2
    // Or linear: CD0 + CD_alpha * |alpha| ...
    // Using json params:
    const CD_total = aero.CD0 + aero.CD_alpha * Math.abs(alpha) + Math.abs(aero.CD_de * de_eff);

    // 3. Side Force Coefficient (CY)
    const CY_total = aero.CY_beta * beta +
        aero.CY_p * p_hat +
        aero.CY_r * r_hat +
        aero.CY_da * da_eff +
        aero.CY_dr * dr_eff;

    // Forces in Stability Axis?
    // Lift is perpendicular to wind vector projected on x-z plane.
    // Drag is parallel to wind vector.
    // We need to rotate Lift (-z_stab) and Drag (-x_stab) to Body Frame.

    // Body Frame Forces (Fx, Fy, Fz)
    // Fx = -Drag * cos(alpha) + Lift * sin(alpha)
    // Fz = -Drag * sin(alpha) - Lift * cos(alpha)
    // Fy = SideForce

    const Lift = CL_total * q_bar * S;
    const Drag = CD_total * q_bar * S;
    const SideForce = CY_total * q_bar * S;

    const Fx = -Drag * Math.cos(alpha) + Lift * Math.sin(alpha);
    const Fz = -Drag * Math.sin(alpha) - Lift * Math.cos(alpha);
    const Fy = SideForce;

    // Note: This neglects thrust (handled separately) and gravity (handled in dynamics)

    // Moments Coefficients
    // Roll (Cl)
    const Cl_total = aero.Cl_beta * beta +
        aero.Cl_p * p_hat +
        aero.Cl_r * r_hat +
        aero.Cl_da * da_eff +
        aero.Cl_dr * dr_eff;

    // Pitch (Cm)
    const Cm_total = aero.Cm0 +
        aero.Cm_alpha * alpha +
        aero.Cm_q * q_hat +
        aero.Cm_de * de_eff;

    // Yaw (Cn)
    const Cn_total = aero.Cn_beta * beta +
        aero.Cn_p * p_hat +
        aero.Cn_r * r_hat +
        aero.Cn_da * da_eff +
        aero.Cn_dr * dr_eff;

    // Dimensional Moments
    // Roll = Cl * q_bar * S * b
    // Pitch = Cm * q_bar * S * c
    // Yaw = Cn * q_bar * S * b

    const Mx = Cl_total * q_bar * S * b;
    const My = Cm_total * q_bar * S * c;
    const Mz = Cn_total * q_bar * S * b;

    return {
        forces: { x: Fx, y: Fy, z: Fz },
        moments: { x: Mx, y: My, z: Mz }
    };
}
