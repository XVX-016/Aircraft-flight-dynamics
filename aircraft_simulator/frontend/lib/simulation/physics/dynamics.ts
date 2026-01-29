import { TruthState, Vector3, EKFState } from "../types/state";
import { AircraftConfig } from "../types/aircraft";
import { ControlInput } from "../types/control";
import { calculateAerodynamics } from "./aerodynamics";
import { Vec3, Quat } from "./math-utils";

const GRAVITY = 9.81;

/**
 * 6DOF Equations of Motion Integrator
 */
export class RigidBody {
    constructor(private config: AircraftConfig) { }

    /**
     * Propagate state by time step dt
     */
    step(state: TruthState, controls: ControlInput, dt: number): TruthState {
        // 1. Calculate Airspeed, Alpha, Beta
        const Va = Vec3.mag(state.v);
        // Protect against singularity at low speeds
        const alpha = Va > 0.1 ? Math.atan2(state.v.z, state.v.x) : 0;
        const beta = Va > 0.1 ? Math.asin(state.v.y / Va) : 0;

        // Update derived state properties first
        const currentState = {
            ...state,
            alpha,
            beta
        };

        // 2. Calculate Forces and Moments
        // Aerodynamics
        const aero = calculateAerodynamics(currentState, this.config, controls);

        // Propulsion
        // Assume simple engine model: Thrust aligned with body x-axis (approx)
        let thrustTotal = { x: 0, y: 0, z: 0 };
        let momentProp = { x: 0, y: 0, z: 0 };

        for (const engine of this.config.propulsion) {
            const thrustMag = engine.maxThrust * controls.throttle;
            const thrustForce = Vec3.scale(engine.direction, thrustMag);
            thrustTotal = Vec3.add(thrustTotal, thrustForce);

            // Moment = r x F
            const arm = engine.position; // Position relative to CG? 
            // Config says "relative to datum". MassProps says "CG relative to datum".
            // Arm = pos_engine - pos_cg
            const r = Vec3.sub(engine.position, this.config.massProps.cg);
            const m = Vec3.cross(r, thrustForce);
            momentProp = Vec3.add(momentProp, m);
        }

        const F_aero = aero.forces;
        const M_aero = aero.moments;

        // Gravity (in Body Frame)
        // g_body = q_inv * [0, 0, g_inertial] * q
        // g vector in inertial is [0, 0, 9.81]
        const g_inertial = { x: 0, y: 0, z: GRAVITY };
        const g_body = Vec3.transformInertialToBody(g_inertial, state.q);
        const F_gravity = Vec3.scale(g_body, this.config.massProps.mass);

        // Total Forces (Body Frame)
        // F_total = F_aero + F_prop + F_gravity
        const F_total = Vec3.add(Vec3.add(F_aero, thrustTotal), F_gravity);

        // Total Moments (Body Frame)
        const M_total = Vec3.add(M_aero, momentProp);

        // 3. Equations of Motion (Body Frame)
        // Translational: F = m * (v_dot + w x v)
        // v_dot = F/m - w x v
        const F_div_m = Vec3.scale(F_total, 1 / this.config.massProps.mass);
        const w_cross_v = Vec3.cross(state.w, state.v);
        const v_dot = Vec3.sub(F_div_m, w_cross_v);

        // Rotational: M = I * w_dot + w x (I * w)
        // w_dot = I_inv * (M - w x (I * w))
        // Simplified assuming diagonal inertia tensor (Ixz = 0 for now in math utils or handle it?)
        // The helper below handles full tensor logic inline for clarity
        const { Ixx, Iyy, Izz, Ixz } = this.config.massProps;

        /* 
           Angular acceleration with cross-products of inertia.
           Ideally inverse matrix multiply. For tri-diagonal (Ixz):
           
           Hx = Ixx*p - Ixz*r
           Hy = Iyy*q
           Hz = Izz*r - Ixz*p
           
           Mx = Hx_dot + q*Hz - r*Hy
           My = Hy_dot + r*Hx - p*Hz
           Mz = Hz_dot + p*Hy - q*Hx
        */

        // Angular Momentum H
        const H = {
            x: Ixx * state.w.x - Ixz * state.w.z,
            y: Iyy * state.w.y,
            z: Izz * state.w.z - Ixz * state.w.x
        };

        // w x H
        const w_x_H = Vec3.cross(state.w, H);

        // RHS = M - w x H
        const RHS = Vec3.sub(M_total, w_x_H);

        // Solve for w_dot: I * w_dot = RHS
        // Determinant for planar algebra (xz coupling)
        const det = Ixx * Izz - Ixz * Ixz;

        const w_dot_x = (Izz * RHS.x + Ixz * RHS.z) / det;
        const w_dot_y = RHS.y / Iyy;
        const w_dot_z = (Ixz * RHS.x + Ixx * RHS.z) / det;

        const w_dot = { x: w_dot_x, y: w_dot_y, z: w_dot_z };


        // 4. Integration (Euler for now, RK4 later if needed)
        const v_new = Vec3.add(state.v, Vec3.scale(v_dot, dt));
        const w_new = Vec3.add(state.w, Vec3.scale(w_dot, dt));

        // Kinematics
        // Position dot (Inertial) = q * v_body * q_inv
        // Use AVERAGE velocity for better stability? Or just current.
        const v_inertial = Vec3.transformBodyToInertial(state.v, state.q);
        const p_new = Vec3.add(state.p, Vec3.scale(v_inertial, dt));

        // Attitude: q_dot = 0.5 * q * w
        const q_new = Quat.integrate(state.q, state.w, dt);

        return {
            p: p_new,
            v: v_new,
            q: q_new,
            w: w_new,
            // Biases constant for truth state (handled in EKF/Sensors)
            b_g: state.b_g,
            b_a: state.b_a,

            // Derived Data for logging/viz
            forces: F_total,
            moments: M_total,
            alpha: alpha,
            beta: beta
        };
    }
}
