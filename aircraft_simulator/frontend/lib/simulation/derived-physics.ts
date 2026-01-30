/**
 * Derived Physics Layer
 * 
 * Computes visualization and telemetry data from the raw truth state.
 * This module is PURE. No React, no Three.js, no side effects.
 */
import { TruthState, Vector3 } from "./types/state";

// Constants
const RHO_SEA_LEVEL = 1.225; // kg/m³

/**
 * Derived state for UI, Telemetry, and Flow Visualization.
 */
export interface DerivedPhysics {
    // Core Telemetry
    altitude: number;      // meters (positive up)
    airspeed: number;      // m/s
    groundSpeed: number;   // m/s
    verticalSpeed: number; // m/s (positive up)

    // Aerodynamic Angles
    aoa: number;           // radians
    sideslip: number;      // radians

    // Performance
    mach: number;
    dynamicPressure: number; // Pa
    gLoad: number;

    // Flow Visualization Params
    flowStrength: number;  // Proportional to |AoA|
    liftDirection: Vector3; // Normalized
}

/**
 * Pure function: Compute derived physics from truth state.
 * @param state The current truth state.
 * @param atmosphereModel Optional atmosphere lookup (defaults to sea level).
 */
export function derivePhysics(state: TruthState): DerivedPhysics {
    const { p, v, alpha, beta, forces } = state;

    // --- Telemetry ---
    const altitude = -p.z; // NED convention: z is down
    const airspeed = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
    const groundSpeed = Math.sqrt(v.x ** 2 + v.y ** 2);
    const verticalSpeed = -v.z;

    // --- Aerodynamic Angles ---
    // Already computed by the dynamics, but we can re-derive for safety:
    const aoa = airspeed > 1 ? Math.atan2(v.z, v.x) : 0;
    const sideslip = airspeed > 1 ? Math.atan2(v.y, v.x) : 0;

    // --- Performance ---
    const speedOfSound = 340; // m/s at sea level approx
    const mach = airspeed / speedOfSound;
    const dynamicPressure = 0.5 * RHO_SEA_LEVEL * airspeed ** 2;

    // G-Load (Lift / Weight) - rough estimate
    const liftMagnitude = Math.sqrt(forces.x ** 2 + forces.y ** 2 + forces.z ** 2);
    const weight = 12000 * 9.81; // Placeholder mass
    const gLoad = liftMagnitude / weight;

    // --- Flow Visualization ---
    const flowStrength = Math.min(Math.abs(alpha) * 5, 1.0); // Clamped 0-1
    const liftDirection: Vector3 = {
        x: 0,
        y: Math.sin(alpha),
        z: -Math.cos(alpha)
    };

    return {
        altitude,
        airspeed,
        groundSpeed,
        verticalSpeed,
        aoa: alpha, // Use pre-computed from dynamics
        sideslip: beta,
        mach,
        dynamicPressure,
        gLoad,
        flowStrength,
        liftDirection
    };
}
