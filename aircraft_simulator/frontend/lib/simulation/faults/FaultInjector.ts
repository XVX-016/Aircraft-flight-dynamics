/**
 * FAULT INJECTOR
 * Applies fault models to sensor measurements.
 * 
 * Each fault type follows real-world aerospace failure modes:
 * - Bias step: Sudden offset (e.g., thermal shock)
 * - Bias ramp: Random walk drift (e.g., aging, temperature)
 * - Dropout: Lost measurement (e.g., packet loss, interference)
 * - Freeze: Stuck sensor (e.g., mechanical jam)
 */

import {
    FaultConfig,
    FaultType,
    SensorFaultState,
    FaultInjectionResult,
    createDefaultFaultState
} from './types';

export class FaultInjector {
    private faultState: SensorFaultState;
    private frozenValues: Map<string, number[]> = new Map();
    private biasAccumulators: Map<string, number[]> = new Map();

    constructor() {
        this.faultState = createDefaultFaultState();
    }

    /**
     * Configure faults for a sensor
     */
    setFaults(
        sensor: 'imu_accel' | 'imu_gyro' | 'gps_pos' | 'gps_vel' | 'baro' | 'mag',
        faults: FaultConfig[]
    ): void {
        switch (sensor) {
            case 'imu_accel':
                this.faultState.imu.accel = faults;
                break;
            case 'imu_gyro':
                this.faultState.imu.gyro = faults;
                break;
            case 'gps_pos':
                this.faultState.gps.position = faults;
                break;
            case 'gps_vel':
                this.faultState.gps.velocity = faults;
                break;
            case 'baro':
                this.faultState.baro = faults;
                break;
            case 'mag':
                this.faultState.magnetometer = faults;
                break;
        }
    }

    /**
     * Clear all faults
     */
    clearFaults(): void {
        this.faultState = createDefaultFaultState();
        this.frozenValues.clear();
        this.biasAccumulators.clear();
    }

    /**
     * Apply faults to a vector measurement (IMU, GPS, etc.)
     */
    applyFaultsToVector(
        sensorId: string,
        measurement: [number, number, number],
        t: number,
        faults: FaultConfig[],
        dt: number
    ): FaultInjectionResult {
        const result: [number, number, number] = [...measurement];
        let isDropout = false;
        let isFrozen = false;
        const activeFaults: FaultType[] = [];

        // Get or initialize bias accumulator for ramp faults
        if (!this.biasAccumulators.has(sensorId)) {
            this.biasAccumulators.set(sensorId, [0, 0, 0]);
        }
        const biasAcc = this.biasAccumulators.get(sensorId)!;

        for (const fault of faults) {
            // Check if fault is active at this time
            if (t < fault.startTime || t > fault.startTime + fault.duration) {
                continue;
            }

            activeFaults.push(fault.type);
            const axisIdx = fault.axis === 'x' ? 0 : fault.axis === 'y' ? 1 : 2;

            switch (fault.type) {
                case 'bias_step':
                    // Add constant bias
                    if (fault.axis) {
                        result[axisIdx] += fault.magnitude;
                    } else {
                        result[0] += fault.magnitude;
                        result[1] += fault.magnitude;
                        result[2] += fault.magnitude;
                    }
                    break;

                case 'bias_ramp':
                    // Random walk: accumulate drift over time
                    const timeSinceStart = t - fault.startTime;
                    const drift = fault.magnitude * timeSinceStart;
                    if (fault.axis) {
                        biasAcc[axisIdx] += fault.magnitude * dt * (Math.random() - 0.5) * 2;
                        result[axisIdx] += biasAcc[axisIdx];
                    } else {
                        for (let i = 0; i < 3; i++) {
                            biasAcc[i] += fault.magnitude * dt * (Math.random() - 0.5) * 2;
                            result[i] += biasAcc[i];
                        }
                    }
                    break;

                case 'dropout':
                    isDropout = true;
                    break;

                case 'freeze':
                    isFrozen = true;
                    const frozenKey = sensorId;
                    if (!this.frozenValues.has(frozenKey)) {
                        // Capture the value at freeze time
                        this.frozenValues.set(frozenKey, [...measurement]);
                    }
                    const frozen = this.frozenValues.get(frozenKey)!;
                    result[0] = frozen[0];
                    result[1] = frozen[1];
                    result[2] = frozen[2];
                    break;
            }
        }

        return {
            value: result,
            isDropout,
            isFrozen,
            activeFaults
        };
    }

    /**
     * Apply faults to a scalar measurement (barometer)
     */
    applyFaultsToScalar(
        sensorId: string,
        measurement: number,
        t: number,
        faults: FaultConfig[],
        dt: number
    ): FaultInjectionResult {
        let result = measurement;
        let isDropout = false;
        let isFrozen = false;
        const activeFaults: FaultType[] = [];

        // Get or initialize bias accumulator
        if (!this.biasAccumulators.has(sensorId)) {
            this.biasAccumulators.set(sensorId, [0]);
        }
        const biasAcc = this.biasAccumulators.get(sensorId)!;

        for (const fault of faults) {
            if (t < fault.startTime || t > fault.startTime + fault.duration) {
                continue;
            }

            activeFaults.push(fault.type);

            switch (fault.type) {
                case 'bias_step':
                    result += fault.magnitude;
                    break;

                case 'bias_ramp':
                    biasAcc[0] += fault.magnitude * dt * (Math.random() - 0.5) * 2;
                    result += biasAcc[0];
                    break;

                case 'dropout':
                    isDropout = true;
                    break;

                case 'freeze':
                    isFrozen = true;
                    if (!this.frozenValues.has(sensorId)) {
                        this.frozenValues.set(sensorId, [measurement]);
                    }
                    result = this.frozenValues.get(sensorId)![0];
                    break;
            }
        }

        return {
            value: result,
            isDropout,
            isFrozen,
            activeFaults
        };
    }

    /**
     * Get current fault state (for UI display)
     */
    getFaultState(): SensorFaultState {
        return this.faultState;
    }

    /**
     * Inject IMU accelerometer faults
     */
    injectAccelFaults(
        measurement: [number, number, number],
        t: number,
        dt: number
    ): FaultInjectionResult {
        return this.applyFaultsToVector(
            'imu_accel',
            measurement,
            t,
            this.faultState.imu.accel,
            dt
        );
    }

    /**
     * Inject IMU gyroscope faults
     */
    injectGyroFaults(
        measurement: [number, number, number],
        t: number,
        dt: number
    ): FaultInjectionResult {
        return this.applyFaultsToVector(
            'imu_gyro',
            measurement,
            t,
            this.faultState.imu.gyro,
            dt
        );
    }

    /**
     * Inject GPS position faults
     */
    injectGPSPositionFaults(
        measurement: [number, number, number],
        t: number,
        dt: number
    ): FaultInjectionResult {
        return this.applyFaultsToVector(
            'gps_pos',
            measurement,
            t,
            this.faultState.gps.position,
            dt
        );
    }

    /**
     * Inject barometer faults
     */
    injectBaroFaults(
        measurement: number,
        t: number,
        dt: number
    ): FaultInjectionResult {
        return this.applyFaultsToScalar(
            'baro',
            measurement,
            t,
            this.faultState.baro,
            dt
        );
    }
}

// Singleton instance
export const faultInjector = new FaultInjector();
