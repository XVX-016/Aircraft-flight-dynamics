export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

/**
 * Standard Aerospace State Vector
 * All units in SI (meters, m/s, radians, rad/s)
 */
export interface EKFState {
    /**
     * Position in Inertial Frame (NED: North, East, Down)
     */
    p: Vector3;

    /**
     * Velocity in Body Frame (u, v, w)
     */
    v: Vector3;

    /**
     * Attitude Quaternion (Body to Inertial)
     */
    q: Quaternion;

    /**
     * Angular Rates in Body Frame (p, q, r)
     */
    w: Vector3;

    /**
     * Gyroscope Bias (rad/s)
     */
    b_g: Vector3;

    /**
     * Accelerometer Bias (m/s^2)
     */
    b_a: Vector3;
}

/**
 * Truth State from Physics Engine
 * Contains additional data not present in estimated state (like forces)
 */
export interface TruthState extends EKFState {
    // Derived quantities handy for visualization/logging
    forces: Vector3;
    moments: Vector3;
    alpha: number; // Angle of Attack (rad)
    beta: number;  // Sideslip Angle (rad)
}
