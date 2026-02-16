export function validateState(orientation: [number, number, number], airspeed: number, altitude: number) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (Math.abs(orientation[0]) > 1.047) errors.push("CRITICAL: Structural bank limit exceeded (>60deg)");
    if (Math.abs(orientation[1]) > 0.523) errors.push("CRITICAL: Unusual attitude (Pitch >30deg)");
    if (airspeed < 45) errors.push("WARNING: Airspeed below power-off stall speed");
    if (altitude > 18000) errors.push("CRITICAL: Service ceiling exceeded");

    if (airspeed > 250) warnings.push("Vne exceedance risk: reduce throttle");
    if (altitude < 100) warnings.push("Ground proximity alert");

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

