export class Sensors {
    private noiseStdDev: number[]; // For each of 12 states

    constructor() {
        // Define noise characteristics
        // u,v,w (airspeed) ~ 1 m/s
        // p,q,r (gyro) ~ 0.01 rad/s
        // phi,theta,psi (ahrs) ~ 0.02 rad
        // x,y,z (gps) ~ 2m
        this.noiseStdDev = [
            1.0, 1.0, 1.0,
            0.01, 0.01, 0.01,
            0.02, 0.02, 0.02,
            5.0, 5.0, 5.0
        ];
    }

    public measure(trueState: number[]): number[] {
        // Simulate sensor readings by adding Gaussian noise
        return trueState.map((val, i) => val + this.gaussianRandom(0, this.noiseStdDev[i]));
    }

    private gaussianRandom(mean: number, std: number): number {
        const u = 1 - Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * std + mean;
    }
}
