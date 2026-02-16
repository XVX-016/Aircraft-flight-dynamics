import { PID } from "./pid";
import { LQR } from "./lqr";
import { ControlInput } from "../../lib/simulation/types/control";
import { CESSNA_172R } from "../aircraft/database/cessna172";
import { Linearization } from "../analysis/linearization";

export enum AutopilotMode {
    OFF,
    LQR_HOLD,     // Full state hold
    PID_SIMPLE    // Basic altitude/heading hold
}

export class Autopilot {
    public mode: AutopilotMode = AutopilotMode.OFF;

    // PID Controllers
    private altPID = new PID(0.1, 0.01, 0.05, -0.2, 0.2); // Elevator output
    private hdgPID = new PID(1.0, 0.0, 0.1, -0.5, 0.5);   // Aileron output
    private spdPID = new PID(0.5, 0.1, 0.0, 0, 1);        // Throttle output

    // LQR
    private lqr = new LQR();
    private linearization = new Linearization(CESSNA_172R);
    private refState: number[] | null = null;

    // Targets
    public targetAltitude: number = 1000;
    public targetHeading: number = 0;
    public targetSpeed: number = 60;

    public update(dt: number, state: number[]): ControlInput {
        if (this.mode === AutopilotMode.OFF) {
            return { throttle: 0, elevator: 0, aileron: 0, rudder: 0 };
        }

        if (this.mode === AutopilotMode.PID_SIMPLE) {
            // Unpack state: [u, v, w, p, q, r, phi, theta, psi, x, y, z]
            const z = state[11]; // Down is positive, Altitude = -z
            const psi = state[8];
            const u_vel = state[0]; // Approx airspeed

            const altError = this.targetAltitude - (-z);
            const elevator = this.altPID.update(altError, dt);

            // Heading logic (simple error wrap needed ideally)
            const hdgError = this.targetHeading - psi;
            const aileron = this.hdgPID.update(hdgError, dt);

            const spdError = this.targetSpeed - u_vel;
            const throttle = this.spdPID.update(spdError, dt);

            return {
                throttle: Math.max(0, Math.min(1, 0.5 + throttle)), // Base 50%
                elevator: -elevator, // Pitch up to climb
                aileron: aileron,
                rudder: 0
            };
        }

        if (this.mode === AutopilotMode.LQR_HOLD) {
            if (!this.lqr['K']) {
                // Compute K on first enable? Or assume pre-computed
                // For now, let's assume we need to compute it once.
                // This is heavy, should be async or pre-calculated.
                return { throttle: 0.5, elevator: 0, aileron: 0, rudder: 0 };
            }

            if (!this.refState) this.refState = [...state];

            const u_vec = this.lqr.update(state, this.refState);
            // u_vec = [delta_thrust, delta_elev, delta_ail, delta_rud]

            // Map to controls (add trim?)
            // Assuming linearized around trim controls?
            return {
                throttle: 0.5 + u_vec[0],
                elevator: u_vec[1],
                aileron: u_vec[2],
                rudder: u_vec[3]
            };
        }

        return { throttle: 0, elevator: 0, aileron: 0, rudder: 0 };
    }
}
