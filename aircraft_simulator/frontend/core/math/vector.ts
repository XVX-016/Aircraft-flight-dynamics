export type Vector3 = [number, number, number];

export class Vec3 {
    static add(a: Vector3, b: Vector3): Vector3 {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    static sub(a: Vector3, b: Vector3): Vector3 {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    static sca(a: Vector3, s: number): Vector3 {
        return [a[0] * s, a[1] * s, a[2] * s];
    }

    static mag(a: Vector3): number {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    }

    static cross(a: Vector3, b: Vector3): Vector3 {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    static dot(a: Vector3, b: Vector3): number {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }
}
