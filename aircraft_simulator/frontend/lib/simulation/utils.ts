
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

export const Vec3 = {
    add: (a: Vector3, b: Vector3): Vector3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
    sub: (a: Vector3, b: Vector3): Vector3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    scale: (v: Vector3, s: number): Vector3 => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
    dot: (a: Vector3, b: Vector3): number => a.x * b.x + a.y * b.y + a.z * b.z,
    cross: (a: Vector3, b: Vector3): Vector3 => ({
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    }),
    magnitude: (v: Vector3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
    normalize: (v: Vector3): Vector3 => {
        const m = Vec3.magnitude(v);
        return m > 0 ? Vec3.scale(v, 1 / m) : { x: 0, y: 0, z: 0 };
    },

    // Transform vector from Inertial to Body frame using Quaternion
    // v_body = q* . v_inertial . q
    transformInertialToBody: (v: Vector3, q: Quaternion): Vector3 => {
        // Conjugate of q for rotation frame inverse
        const q_inv = { x: -q.x, y: -q.y, z: -q.z, w: q.w };
        return Quat.rotate(v, q_inv);
    },

    // Transform vector from Body to Inertial frame using Quaternion
    // v_inertial = q . v_body . q*
    transformBodyToInertial: (v: Vector3, q: Quaternion): Vector3 => {
        return Quat.rotate(v, q);
    }
};

export const Quat = {
    identity: (): Quaternion => ({ x: 0, y: 0, z: 0, w: 1 }),

    // Rotate vector v by quaternion q
    rotate: (v: Vector3, q: Quaternion): Vector3 => {
        // p = (0, v)
        // p' = q * p * q'

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

    fromEuler: (phi: number, theta: number, psi: number): Quaternion => {
        const c1 = Math.cos(psi / 2);
        const c2 = Math.cos(theta / 2);
        const c3 = Math.cos(phi / 2);
        const s1 = Math.sin(psi / 2);
        const s2 = Math.sin(theta / 2);
        const s3 = Math.sin(phi / 2);

        return {
            x: c1 * c2 * s3 - s1 * s2 * c3,
            y: c1 * s2 * c3 + s1 * c2 * s3,
            z: s1 * c2 * c3 - c1 * s2 * s3,
            w: c1 * c2 * c3 + s1 * s2 * s3
        };
    },

    toEuler: (q: Quaternion): Vector3 => {
        const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
        const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
        const phi = Math.atan2(sinr_cosp, cosr_cosp);

        const sinp = 2 * (q.w * q.y - q.z * q.x);
        let theta = 0;
        if (Math.abs(sinp) >= 1)
            theta = Math.sign(sinp) * Math.PI / 2; // use 90 degrees if out of range
        else
            theta = Math.asin(sinp);

        const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
        const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
        const psi = Math.atan2(siny_cosp, cosy_cosp);

        return { x: phi, y: theta, z: psi };
    },

    // Integrate quaternion given angular velocity w (rad/s) and dt
    // q_new = q_old + 0.5 * w * q_old * dt
    integrate: (q: Quaternion, w: Vector3, dt: number): Quaternion => {
        const q_dot_x = 0.5 * (w.x * q.w + w.y * q.z - w.z * q.y);
        const q_dot_y = 0.5 * (w.y * q.w - w.x * q.z + w.z * q.x);
        const q_dot_z = 0.5 * (w.z * q.w + w.x * q.y - w.y * q.x);
        const q_dot_w = 0.5 * (-w.x * q.x - w.y * q.y - w.z * q.z);

        const q_new = {
            x: q.x + q_dot_x * dt,
            y: q.y + q_dot_y * dt,
            z: q.z + q_dot_z * dt,
            w: q.w + q_dot_w * dt
        };

        // Normalize
        const mag = Math.sqrt(q_new.x * q_new.x + q_new.y * q_new.y + q_new.z * q_new.z + q_new.w * q_new.w);
        return {
            x: q_new.x / mag,
            y: q_new.y / mag,
            z: q_new.z / mag,
            w: q_new.w / mag
        };
    }
};
