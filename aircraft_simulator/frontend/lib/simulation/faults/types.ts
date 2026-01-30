/**
 * FAULT INJECTION TYPES
 * Defines fault models for sensor failure simulation.
 * 
 * Reference: Typical fault modes in aerospace sensor systems
 */

export type FaultType =
    | 'none'
    | 'bias_step'      // Sudden bias offset
    | 'bias_ramp'      // Slowly growing bias (random walk)
    | 'dropout'        // Measurement goes NaN
    | 'freeze';        // Measurement frozen at last value

export interface FaultConfig {
    type: FaultType;
    startTime: number;      // When fault begins (seconds)
    duration: number;       // How long fault lasts (seconds, Infinity for permanent)
    magnitude: number;      // Bias magnitude or ramp rate
    axis?: 'x' | 'y' | 'z'; // Which axis affected (for vector sensors)
}

export interface SensorFaultState {
    imu: {
        accel: FaultConfig[];
        gyro: FaultConfig[];
    };
    gps: {
        position: FaultConfig[];
        velocity: FaultConfig[];
    };
    baro: FaultConfig[];
    magnetometer: FaultConfig[];
}

/**
 * Default: No faults active
 */
export function createDefaultFaultState(): SensorFaultState {
    return {
        imu: {
            accel: [],
            gyro: []
        },
        gps: {
            position: [],
            velocity: []
        },
        baro: [],
        magnetometer: []
    };
}

/**
 * Fault injection result for a single measurement
 */
export interface FaultInjectionResult {
    value: number[] | number;   // Corrupted measurement
    isDropout: boolean;         // Whether this measurement should be skipped
    isFrozen: boolean;          // Whether measurement is frozen
    activeFaults: FaultType[];  // List of active fault types
}
