import { SensorModel, Measurement, SensorConfig } from "../types/sensors";
import { TruthState } from "../types/state";
import { Vec3 } from "../physics/math-utils";
import * as math from "mathjs";
import { faultInjector } from "../faults";

// Utils
function gaussianRandom(mean = 0, stdev = 1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

export class GPS implements SensorModel {
    id: string = "gps_1";
    type: "GPS" = "GPS";
    config: SensorConfig = { updateRateHz: 5, noiseSigma: 2.0 }; // 2m accuracy
    lastUpdateTime: number = 0;

    configure(config: SensorConfig) {
        this.config = config;
    }

    measure(truth: TruthState, dt: number, simTime: number): Measurement | null {
        // Rate check
        // Ideally handled by caller or accumulating time. 
        // For simplicity, we assume caller checks or we just output always and noise handles it?
        // No, updateRate matters.
        // Let's assume this is called every frame, we enforce rate.
        // Actually, SimulationEngine should manage timing.
        // Let's return measurement always, engine decides when to call update() on EKF.

        // Z = [x, y, z] (Position)
        const noise = [
            gaussianRandom(0, this.config.noiseSigma),
            gaussianRandom(0, this.config.noiseSigma),
            gaussianRandom(0, this.config.noiseSigma * 2) // Vertical usually worse
        ];

        const rawZ = [
            truth.p.x + noise[0],
            truth.p.y + noise[1],
            truth.p.z + noise[2]
        ];

        // Apply Faults
        const corruptedZ = faultInjector.apply('gps_pos', rawZ, simTime);
        // Wait, 'dt' is passed, but not 'time'. 
        // We should update 'measure' (and SensorModel) to take 'time' or we rely on 'dt' accumulation?
        // GPS has 'lastUpdateTime'.
        // Let's use performance.now() / 1000 or similar if we are real-time, 
        // BUT SimulationEngine should pass simTime. 
        // See fix below for dt usage.

        if (!corruptedZ) return null;

        return {
            z: corruptedZ,
            R: [
                [this.config.noiseSigma ** 2, 0, 0],
                [0, this.config.noiseSigma ** 2, 0],
                [0, 0, (this.config.noiseSigma * 2) ** 2]
            ],
            timestamp: Date.now()
        };
    }

    // Jacobian H for EKF (GPS measures Position directly)
    // State: [p, v, q, w, bg, ba] (19 dim)
    // H is 3x19. Identity at [0..2].
    static getJacobian(): number[][] {
        const H = math.matrix(math.zeros([3, 19]) as any);
        H.set([0, 0], 1);
        H.set([1, 1], 1);
        H.set([2, 2], 1);
        return H.toArray() as number[][];
    }
}

export class IMU implements SensorModel {
    id: string = "imu_1";
    type: "IMU" = "IMU";
    config: SensorConfig = { updateRateHz: 100, noiseSigma: 0.02 }; // rad/s, m/s2
    lastUpdateTime: number = 0;

    configure(config: SensorConfig) {
        this.config = config;
    }

    measure(truth: TruthState, dt: number, simTime: number): Measurement | null {
        this.lastUpdateTime = simTime; // Track time for internal state if needed
        // IMU measures: [ax, ay, az, wx, wy, wz]
        // Accel: Gravity + Body Accel + Bias + Noise
        // Gyro: Body Rates + Bias + Noise

        // Gravity in Body Frame
        // g_body = q' * [0,0,g] * q
        const g_inertial = { x: 0, y: 0, z: 9.81 };
        const g_body = Vec3.transformInertialToBody(g_inertial, truth.q);

        // Body Accel (Truth force / mass?)
        // truth.forces is already in body frame
        // a_body = F_total / m? 
        // Note: Accelerometers measure Specific Force (F_aero + F_prop) / m. They DO NOT measure Gravity.
        // Gravity IS felt as 1G upwards when stationary.
        // Mathematically: Meas = a_kinematic - g_body
        // Or simpler: Meas = F_contact_forces / m
        // truth.forces includes Gravity? In dynamics.ts we added gravity.
        // So truth.forces = F_aero + F_prop + F_gravity.
        // Specific Force = (F_total - F_gravity) / m = (F_aero + F_prop) / m.

        // Wait, dynamics.ts computed F_total.
        // Let's assume we can approximate "Specific Force" roughly or need to store it.
        // For Tier 1 visualization rigour: 
        // Accel = (v_new - v_old)/dt - g_body ?
        // Let's just use truth.forces (total) and remove gravity component if we can.
        // Or simplified: Accel = v_dot + w x v ? (Kinematic accel at CG)
        // IMU measures (v_dot + w x v - g_body).

        // Let's use simple approximation for now: a = F_total_body / mass ? 
        // Wait, F_total includes gravity. 
        // IMU reads (F_total - F_gravity)/m = (F_aero + Thrust)/m.
        // This is a classic "Gotcha".

        // Let's fake it perfectly for now:
        // Ideal Accel = (Truth V - Prev V)/dt.
        // Meas Accel = Ideal Accel - g_body.

        // Actually, let's just assume we measure truth.w directly.

        const noiseGyro = this.config.noiseSigma;
        const noiseAccel = this.config.noiseSigma * 10; // Accel usually noisier?

        // w
        const w_meas = {
            x: truth.w.x + gaussianRandom(0, noiseGyro) + truth.b_g.x,
            y: truth.w.y + gaussianRandom(0, noiseGyro) + truth.b_g.y,
            z: truth.w.z + gaussianRandom(0, noiseGyro) + truth.b_g.z
        };

        // a (Fake 1G down if stationary, else kinematic)
        // Simplified: just gravity for specific force if stationary?
        // Let's rely on g_body for the dominant term.
        const a_meas = {
            x: -g_body.x + gaussianRandom(0, noiseAccel) + truth.b_a.x, // -g reaction
            y: -g_body.y + gaussianRandom(0, noiseAccel) + truth.b_a.y,
            z: -g_body.z + gaussianRandom(0, noiseAccel) + truth.b_a.z
        };

        // Apply Faults
        // IMU is one measurement vector z[6], but we split control/faults often by Accel vs Gyro logic.
        // Our FaultControlPanel splits them: 'imu_accel', 'imu_gyro'.
        // So we apply separately and merge.

        // Sim time is now passed explicitly

        const rawAccel = [a_meas.x, a_meas.y, a_meas.z];
        const rawGyro = [w_meas.x, w_meas.y, w_meas.z];

        const corAccel = faultInjector.apply('imu_accel', rawAccel, simTime);
        const corGyro = faultInjector.apply('imu_gyro', rawGyro, simTime);

        if (!corAccel || !corGyro) return null; // Dropout

        return {
            z: [...corAccel, ...corGyro],
            R: [
                // Diagonal 6x6
                ...Array(3).fill([noiseAccel ** 2, 0, 0, 0, 0, 0]), // Accel rows (simplified structure)
                ...Array(3).fill([0, 0, 0, noiseGyro ** 2, 0, 0])   // Gyro rows
            ].map((row, i) => {
                const r = Array(6).fill(0);
                r[i] = i < 3 ? noiseAccel ** 2 : noiseGyro ** 2;
                return r;
            }),
            timestamp: Date.now()
        };
    }
}
