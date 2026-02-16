import { AircraftConfig } from "../aircraft/aircraft";

export class RigidBody {
    // State Vector: [u, v, w, p, q, r, phi, theta, psi, x, y, z]
    // Indices:
    // 0-2: Velocity (body frame)
    // 3-5: Angular velocity (body frame)
    // 6-8: Euler angles (phi, theta, psi)
    // 9-11: Position (inertial frame)

    constructor(private config: AircraftConfig) { }

    public equationsOfMotion(t: number, state: number[], inputs: { Fx: number, Fy: number, Fz: number, Mx: number, My: number, Mz: number }): number[] {
        const { mass, ixx, iyy, izz, ixz } = this.config.mass;
        const [u, v, w, p, q, r, phi, theta, psi] = state; // x, y, z not needed for derivatives of v, w

        const { Fx, Fy, Fz, Mx, My, Mz } = inputs;

        // 1. Translational Dynamics (Body Frame)
        // F = m(a + w x v)  =>  a = F/m - w x v
        // u_dot = Fx/m - (q*w - r*v)
        // v_dot = Fy/m - (r*u - p*w)
        // w_dot = Fz/m - (p*v - q*u)

        // Add gravity:
        // g vector in body frame:
        // gx = -g * sin(theta)
        // gy = g * sin(phi) * cos(theta)
        // gz = g * cos(phi) * cos(theta)
        const g = 9.81;
        const gx = -g * Math.sin(theta);
        const gy = g * Math.sin(phi) * Math.cos(theta);
        const gz = g * Math.cos(phi) * Math.cos(theta);

        const u_dot = (Fx / mass) + gx - (q * w - r * v);
        const v_dot = (Fy / mass) + gy - (r * u - p * w);
        const w_dot = (Fz / mass) + gz - (p * v - q * u);

        // 2. Rotational Dynamics (Body Frame)
        // Euler's equations: M = I * w_dot + w x (I * w)
        // Assuming Ixz = 0 for now (principal axes) as per data
        // p_dot = (Mx - (Izz - Iyy)*q*r) / Ixx
        // q_dot = (My - (Ixx - Izz)*p*r) / Iyy
        // r_dot = (Mz - (Iyy - Ixx)*p*q) / Izz

        // With Ixz (if nonzero):
        // More complex, but C172 data says Ixz=0.

        const p_dot = (Mx - (izz - iyy) * q * r) / ixx;
        const q_dot = (My - (ixx - izz) * p * r) / iyy;
        const r_dot = (Mz - (iyy - ixx) * p * q) / izz;

        // 3. Kinematics (Euler Rates)
        // phi_dot = p + (q*sin(phi) + r*cos(phi))*tan(theta)
        // theta_dot = q*cos(phi) - r*sin(phi)
        // psi_dot = (q*sin(phi) + r*cos(phi))/cos(theta)

        const tanTheta = Math.tan(theta);
        const secTheta = 1 / Math.cos(theta);

        const phi_dot = p + (q * Math.sin(phi) + r * Math.cos(phi)) * tanTheta;
        const theta_dot = q * Math.cos(phi) - r * Math.sin(phi);
        const psi_dot = (q * Math.sin(phi) + r * Math.cos(phi)) * secTheta;

        // 4. Navigation (Position Rates in Inertial Frame)
        // Transform [u,v,w] body to [x_dot, y_dot, z_dot] inertial
        // Rotation matrix from Body to Earth (NED)
        const cPhi = Math.cos(phi);
        const sPhi = Math.sin(phi);
        const cTheta = Math.cos(theta);
        const sTheta = Math.sin(theta);
        const cPsi = Math.cos(psi);
        const sPsi = Math.sin(psi);

        // R_be (Body to Earth)
        const R11 = cTheta * cPsi;
        const R12 = sPhi * sTheta * cPsi - cPhi * sPsi;
        const R13 = cPhi * sTheta * cPsi + sPhi * sPsi;

        const R21 = cTheta * sPsi;
        const R22 = sPhi * sTheta * sPsi + cPhi * cPsi;
        const R23 = cPhi * sTheta * sPsi - sPhi * cPsi;

        const R31 = -sTheta;
        const R32 = sPhi * cTheta;
        const R33 = cPhi * cTheta;

        const x_dot = R11 * u + R12 * v + R13 * w;
        const y_dot = R21 * u + R22 * v + R23 * w;
        const z_dot = R31 * u + R32 * v + R33 * w;

        return [
            u_dot, v_dot, w_dot,
            p_dot, q_dot, r_dot,
            phi_dot, theta_dot, psi_dot,
            x_dot, y_dot, z_dot
        ];
    }
}
