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
    private trimControls: ControlInput = { throttle: 0.5, elevator: 0, aileron: 0, rudder: 0 };

    // Targets
    public targetAltitude: number = 1000;
    public targetHeading: number = 0;
    public targetSpeed: number = 60;

    private ensureLqrGain(currentState: number[]): void {
        if (this.lqr.hasGain()) return;

        const { A, B } = this.linearization.computeStateInputJacobians(currentState, this.trimControls);
        const n = A.length;
        const m = B[0]?.length || 4;

        const Q = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) => (i === j ? (i < 9 ? 10 : 1) : 0))
        );
        const R = Array.from({ length: m }, (_, i) =>
            Array.from({ length: m }, (_, j) => (i === j ? (i === 0 ? 4 : 2) : 0))
        );

        this.lqr.computeGain(A, B, Q, R);
    }

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
            this.ensureLqrGain(state);

            if (!this.refState) this.refState = [...state];

            const u_vec = this.lqr.update(state, this.refState);
            return {
                throttle: Math.max(0, Math.min(1, this.trimControls.throttle + (u_vec[0] || 0))),
                aileron: Math.max(-0.5, Math.min(0.5, this.trimControls.aileron + (u_vec[1] || 0))),
                elevator: Math.max(-0.5, Math.min(0.5, this.trimControls.elevator + (u_vec[2] || 0))),
                rudder: Math.max(-0.5, Math.min(0.5, this.trimControls.rudder + (u_vec[3] || 0)))
            };
        }

        return { throttle: 0, elevator: 0, aileron: 0, rudder: 0 };
    }
}
