import { TruthState, Vector3 } from "./state";

/**
 * Generic Measurement Interface
 */
export interface Measurement {
    /**
     * Measurement values array
     */
    z: number[];

    /**
     * Measurement Noise Covariance Matrix (R)
     * Flattened or 2D array depending on math lib
     */
    R: number[][];

    /**
     * Timestamp of measurement
     */
    timestamp: number;
}

/**
 * Sensor Configuration
 */
export interface SensorConfig {
    updateRateHz: number;
    noiseSigma: number;      // White noise standard deviation
    biasSigma?: number;      // Random walk standard deviation
    latency?: number;        // Simulated delay in seconds
}

/**
 * Sensor Model Interface
 */
export interface SensorModel {
    id: string;
    type: 'IMU' | 'GPS' | 'Altimeter' | 'Airspeed' | 'Magnetometer';

    /**
     * Configure sensor parameters
     */
    configure(config: SensorConfig): void;

    /**
     * Generate measurement from Truth State
     * @param truth The ground truth state from physics
     * @param dt Time step since last update
     */
    measure(truth: TruthState, dt: number): Measurement | null; // Returns null if not time to measure
}

/**
 * Fault Injection Configuration
 */
export interface FaultConfig {
    enabled: boolean;
    mode: 'dropout' | 'freeze' | 'bias_drift' | 'spikes';
    startTime: number;
    duration: number;
    params?: Record<string, number>; // e.g., { driftRate: 0.1 }
}
