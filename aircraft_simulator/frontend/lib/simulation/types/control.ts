import { EKFState, Vector3 } from "./state";

/**
 * Normalized Control Inputs
 * Range: -1.0 to 1.0 (except throttle 0.0 to 1.0)
 */
export interface ControlInput {
    throttle: number; // 0.0 to 1.0
    elevator: number; // -1.0 (pitch down) to 1.0 (pitch up)
    aileron: number;  // -1.0 (roll left) to 1.0 (roll right)
    rudder: number;   // -1.0 (yaw left) to 1.0 (yaw right)
    flaps?: number;   // 0.0 to 1.0
}

/**
 * Reference Setpoint for Controller
 */
export interface Reference {
    altitude?: number;
    airspeed?: number;
    heading?: number;
    pitch?: number;
    roll?: number;
    // ... extend as needed for autopilot modes
}

/**
 * Controller Contract
 * STRICT RULE: Controller MUST NOT access TruthState, only Estimate.
 */
export interface Controller {
    /**
     * Compute control outputs based on estimated state and reference.
     * @param state The estimated state from the EKF
     * @param ref The desired setpoints
     * @param dt Time step in seconds
     */
    update(state: EKFState, ref: Reference, dt: number): ControlInput;

    /**
     * Reset internal integrators/state
     */
    reset(): void;
}
