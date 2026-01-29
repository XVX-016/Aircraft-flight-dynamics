import { Vector3, Quaternion } from "../types/state";

/**
 * Basic Vector3 Operations
 */
export const Vec3 = {
    zero: (): Vector3 => ({ x: 0, y: 0, z: 0 }),

    add: (a: Vector3, b: Vector3): Vector3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),

    sub: (a: Vector3, b: Vector3): Vector3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),

    scale: (v: Vector3, s: number): Vector3 => ({ x: v.x * s, y: v.y * s, z: v.z * s }),

    dot: (a: Vector3, b: Vector3): number => a.x * b.x + a.y * b.y + a.z * b.z,

    cross: (a: Vector3, b: Vector3): Vector3 => ({
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    }),

    mag: (v: Vector3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),

    normalize: (v: Vector3): Vector3 => {
        const m = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return m === 0 ? { x: 0, y: 0, z: 0 } : { x: v.x / m, y: v.y / m, z: v.z / m };
    },

    // Rotate vector v by quaternion q
    rotateByQuat: (v: Vector3, q: Quaternion): Vector3 => {
        // q * v * q'
        // Optimized implementation
        const ix = q.w * v.x + q.y * v.z - q.z * v.y;
        const iy = q.w * v.y + q.z * v.x - q.x * v.z;
        const iz = q.w * v.z + q.x * v.y - q.y * v.x;
        const iw = -q.x * v.x - q.y * v.y - q.z * v.z;

        return {
            x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
            y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
            z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x
        };
    },

    // Transform body vector to inertial frame using attitude quaternion q_body_to_inertial
    transformBodyToInertial: (v_body: Vector3, q: Quaternion): Vector3 => {
        return Vec3.rotateByQuat(v_body, q);
    },

    // Transform inertial vector to body frame (conjugate rotation)
    transformInertialToBody: (v_inertial: Vector3, q: Quaternion): Vector3 => {
        const q_inv = Quat.conjugate(q);
        return Vec3.rotateByQuat(v_inertial, q_inv);
    }
};

/**
 * Basic Quaternion Operations
 */
export const Quat = {
    identity: (): Quaternion => ({ x: 0, y: 0, z: 0, w: 1 }),

    normalize: (q: Quaternion): Quaternion => {
        const m = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
        return m === 0 ? { x: 0, y: 0, z: 0, w: 1 } : { x: q.x / m, y: q.y / m, z: q.z / m, w: q.w / m };
    },

    conjugate: (q: Quaternion): Quaternion => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w }),

    multiply: (a: Quaternion, b: Quaternion): Quaternion => ({
        x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
        y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
        z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
        w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
    }),

    // Integrate quaternion kinematics: q_dot = 0.5 * q * omega
    integrate: (q: Quaternion, w: Vector3, dt: number): Quaternion => {
        // 0.5 * dt is included in the magnitude of the rotation vector
        // Approximation for small angles: q_new = q_old * q_delta
        // where q_delta is from axis-angle of omega * dt

        const theta = Vec3.mag(w) * dt;
        if (theta < 1e-6) return q;

        const halfTheta = theta * 0.5;
        const sinHalfTheta = Math.sin(halfTheta);

        // Axis of rotation
        const axis = Vec3.scale(w, 1 / Vec3.mag(w)); // Normalized w

        const q_delta: Quaternion = {
            x: axis.x * sinHalfTheta,
            y: axis.y * sinHalfTheta,
            z: axis.z * sinHalfTheta,
            w: Math.cos(halfTheta)
        };

        return Quat.normalize(Quat.multiply(q, q_delta));
    }
};
