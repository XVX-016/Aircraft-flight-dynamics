import { EKFState } from "./state";
import { ControlInput } from "./control";
import { Measurement } from "./sensors";

/**
 * EKF Estimate Output
 */
export interface EKFEstimate {
    xHat: EKFState;
    P: number[][];      // State Covariance Matrix (15x15 or 18x18)
    innovation?: number[]; // Innovation residual (z - H*xHat) for plotting
    nis?: number;        // Normalized Innovation Squared (consistency metric)
}

/**
 * Extended Kalman Filter Contract
 */
export interface EKF {
    /**
     * Initialize the filter
     * @param x0 Initial state guess
     * @param P0 Initial covariance
     */
    init(x0: EKFState, P0: number[][]): void;

    /**
     * Prediction Step (Time Update)
     * @param u Control Inputs
     * @param dt Time step
     * @param Q Process Noise Covariance (optional override)
     */
    predict(u: ControlInput, dt: number, Q?: number[][]): void;

    /**
     * Correction Step (Measurement Update)
     * @param z Measurement object
     * @param H Observation Jacobian (optional if sensor manages it)
     */
    update(z: Measurement, H?: number[][]): void;

    /**
     * Get current estimate
     */
    getEstimate(): EKFEstimate;

    /**
     * Enable/Disable fault monitoring or specific debugging
     */
    setDebugMode(enabled: boolean): void;
}
