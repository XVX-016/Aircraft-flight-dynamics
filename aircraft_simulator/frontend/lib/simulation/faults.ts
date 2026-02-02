/**
 * SIMULATION FAULT INJECTOR
 * 
 * Implements the Failure Taxonomy for Regulator-Grade Validation.
 * manage active faults and corrupts sensor signals before they reach the estimator.
 */

export type FaultType = 'bias_step' | 'bias_ramp' | 'freeze' | 'dropout';

export interface FaultConfig {
    type: FaultType;
    startTime: number;
    duration: number; // 0 or Infinity for permanent
    magnitude: number;
    axis: 'x' | 'y' | 'z'; // Simplification: we map sensor channels to axes
}

export class FaultInjector {
    private activeFaults: Map<string, FaultConfig[]> = new Map();
    private frozenValues: Map<string, number> = new Map(); // Store value at freeze time

    // Singleton instance
    static instance: FaultInjector;

    constructor() {
        if (FaultInjector.instance) return FaultInjector.instance;
        FaultInjector.instance = this;
    }

    public setFaults(sensorId: string, faults: FaultConfig[]) {
        this.activeFaults.set(sensorId, faults);
        // Clear frozen value if freeze is removed? 
        // Simplification: We just overwrite if needed.
    }

    public clearFaults() {
        this.activeFaults.clear();
        this.frozenValues.clear();
    }

    public getFaults(sensorId: string): FaultConfig[] {
        return this.activeFaults.get(sensorId) || [];
    }

    /**
     * Apply faults to a sensor measurement.
     * @param sensorId The ID of the sensor (e.g., 'gps_pos', 'imu_accel')
     * @param values The raw measurement vector (e.g., [x, y, z])
     * @param time Current simulation time
     * @returns Corrupted values or NULL if dropout
     */
    public apply(sensorId: string, values: number[], time: number): number[] | null {
        const faults = this.activeFaults.get(sensorId);
        if (!faults || faults.length === 0) return values;

        let corrupted = [...values];
        let isDropout = false;

        for (const fault of faults) {
            if (time < fault.startTime || time > fault.startTime + fault.duration) continue;

            const axisIdx = this.getAxisIndex(fault.axis);
            if (axisIdx >= values.length) continue;

            switch (fault.type) {
                case 'bias_step':
                    corrupted[axisIdx] += fault.magnitude;
                    break;

                case 'bias_ramp':
                    const dt = time - fault.startTime;
                    corrupted[axisIdx] += fault.magnitude * dt;
                    break;

                case 'freeze':
                    const freezeKey = `${sensorId}_${axisIdx}`;
                    if (!this.frozenValues.has(freezeKey)) {
                        // First time freeze hits, store the CURRENT value (which might already have bias!)
                        // Ideally we freeze the value at t=startTime. 
                        // If we just entered the window, capture now.
                        this.frozenValues.set(freezeKey, corrupted[axisIdx]);
                    }
                    corrupted[axisIdx] = this.frozenValues.get(freezeKey)!;
                    break;

                case 'dropout':
                    isDropout = true;
                    break;
            }
        }

        // Cleanup frozen values for expired faults? 
        // For simplicity, we keep them until clearFaults or overwritten. 
        // Ideally we check if freeze is still active.

        if (isDropout) return null;

        return corrupted;
    }

    private getAxisIndex(axis: 'x' | 'y' | 'z'): number {
        return axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    }
}

export const faultInjector = new FaultInjector();
