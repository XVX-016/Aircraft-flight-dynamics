export interface ValidationResult {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    bounds: {
        stall: boolean;
        mach: boolean;
        stability: boolean;
    };
}

export const STALL_ANGLE = 15; // degrees
export const MAX_MACH = 2.2;
export const STABILITY_THRESHOLD = 0.5;

/**
 * PRODUCTION-GRADE VALIDATION ENGINE
 * Analyzes simulation state for engineering violations.
 */
export function validateState(
    orientation: [number, number, number],
    velocity: number,
    altitude: number
): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        warnings: [],
        errors: [],
        bounds: {
            stall: false,
            mach: false,
            stability: true,
        },
    };

    // 1. Angle of Attack (Stall) Check
    const aoa = Math.abs(orientation[1] * (180 / Math.PI));
    if (aoa > STALL_ANGLE) {
        result.bounds.stall = true;
        result.warnings.push(`High AoA Warning: Flow separation detected at ${aoa.toFixed(1)}°`);
        if (aoa > STALL_ANGLE + 5) {
            result.errors.push("CRITICAL: Aerodynamic Stall Imminent");
        }
    }

    // 2. Mach Check (approximate at Sea Level)
    const mach = velocity / 661; // Approx knots to mach
    if (mach > MAX_MACH) {
        result.bounds.mach = true;
        result.errors.push(`Structural Limit: Mach ${mach.toFixed(2)} exceeds airframe rating`);
    }

    // 3. Numerical Stability Check
    const hasNaN = orientation.some(n => isNaN(n)) || isNaN(velocity) || isNaN(altitude);
    if (hasNaN) {
        result.isValid = false;
        result.errors.push("NUMERICAL DIVERGENCE: Simulation State Corrupted (NaN)");
    }

    // 4. Altitude Check
    if (altitude < 0) {
        result.errors.push("GROUND COLLISION: Negative Altitude");
    }

    if (result.errors.length > 0) result.isValid = false;

    return result;
}
