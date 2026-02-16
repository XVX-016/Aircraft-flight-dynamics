import { AircraftConfig } from "../aircraft/aircraft";

export interface AeroState {
    alpha: number;
    beta: number;
    airspeed: number;
    dynamicPressure: number;
}

export interface ControlInputs {
    throttle: number; // 0 to 1
    elevator: number; // radians
    aileron: number; // radians
    rudder: number; // radians
}

export class Aerodynamics {
    constructor(private config: AircraftConfig) { }

    public calculateForcesAndMoments(
        state: number[],
        controls: ControlInputs
    ): { F: [number, number, number], M: [number, number, number], aeroState: AeroState } {
        const [u, v, w, p, q, r] = state; // Body frame velocities and rates

        // 1. Air Data
        const airspeed = Math.sqrt(u * u + v * v + w * w);

        // Safety check for zero airspeed to avoid NaN
        if (airspeed < 0.1) {
            return {
                F: [0, 0, 0],
                M: [0, 0, 0],
                aeroState: { alpha: 0, beta: 0, airspeed, dynamicPressure: 0 }
            };
        }

        const alpha = Math.atan2(w, u);
        const beta = Math.asin(v / airspeed);

        const rho = 1.225; // Sea level density for now, can upgrade to ISA later
        const qbar = 0.5 * rho * airspeed * airspeed;

        const { wingArea: S, wingSpan: b, meanChord: c } = this.config.geometry;
        const aero = this.config.aero;

        // 2. Non-dimensional Rates
        const qc_2V = (q * c) / (2 * airspeed);
        const pb_2V = (p * b) / (2 * airspeed);
        const rb_2V = (r * b) / (2 * airspeed);

        // 3. Longitudinal Coefficients
        // Lift (CL)
        const CL = aero.cL0 +
            aero.cLa * alpha +
            aero.cLq * qc_2V +
            aero.cLde * controls.elevator;

        // Drag (CD) - Polar
        const CD = aero.cD0 + aero.k * CL * CL;

        // Pitching Moment (Cm)
        const Cm = aero.cm0 +
            aero.cma * alpha +
            aero.cmq * qc_2V +
            aero.cmde * controls.elevator;

        // 4. Lateral-Directional Coefficients
        // Side Force (CY)
        const CY = aero.cyb * beta +
            aero.cndr * controls.rudder; // Small rudder side force approximation

        // Rolling Moment (Cl)
        const Cl = aero.clb * beta +
            aero.clp * pb_2V +
            aero.clda * controls.aileron;

        // Yawing Moment (Cn)
        const Cn = aero.cnb * beta +
            aero.cnr * rb_2V +
            aero.cndr * controls.rudder;

        // 5. Dimensional Forces (Wind Frame -> Body Frame)
        // Lift and Drag are in Stability Frame (Wind frame rotated by -beta usually, but here simplified)
        // Actually, let's strictly definition:
        // Lift is perpendicular to velocity vector in symmetry plane.
        // Drag is parallel to velocity vector.

        // Forces in Stability Axis (Xs, Ys, Zs)
        // L = qbar * S * CL
        // D = qbar * S * CD
        // Y = qbar * S * CY

        const Lift = qbar * S * CL;
        const Drag = qbar * S * CD;
        const SideForce = qbar * S * CY;

        // Rotate from Stability to Body (alpha rotation)
        // Fx = -D * cos(alpha) + L * sin(alpha)
        // Fz = -D * sin(alpha) - L * cos(alpha)
        // Fy = SideForce (approx small beta)

        const Fx_aero = -Drag * Math.cos(alpha) + Lift * Math.sin(alpha);
        const Fz_aero = -Drag * Math.sin(alpha) - Lift * Math.cos(alpha);
        const Fy_aero = SideForce;

        // Moments (Body Frame)
        const Mx_aero = qbar * S * b * Cl;
        const My_aero = qbar * S * c * Cm;
        const Mz_aero = qbar * S * b * Cn;

        // 6. Propulsion
        // Simple thrust model aligned with X-body
        const Thrust = this.config.propulsion.maxThrust * controls.throttle;
        const Fx_prop = Thrust;

        return {
            F: [Fx_aero + Fx_prop, Fy_aero, Fz_aero],
            M: [Mx_aero, My_aero, Mz_aero],
            aeroState: { alpha, beta, airspeed, dynamicPressure: qbar }
        };
    }
}
