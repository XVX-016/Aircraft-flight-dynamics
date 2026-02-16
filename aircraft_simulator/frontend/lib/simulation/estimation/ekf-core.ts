import { EKF, EKFEstimate } from "../types/ekf";
import { EKFState, Vector3, Quaternion } from "../types/state";
import { ControlInput } from "../types/control";
import { Measurement } from "../types/sensors";
import { Vec3, Quat } from "../utils";
import * as math from "mathjs";

// State Dimension: 15
// p(3), v(3), q(4), w(3), bg(3), ba(3) -> Wait, q is 4, but EKF usually uses Error State (3 dim for attitude error) or just normalizes.
// For robust aerospace EKF, we often use Error State Kalman Filter (ESKF) where attitude error is 3D vector.
// But for "Tier 1" implementation as requested, let's try direct state EKF first, but normalize Q.
// Dimension: P(3) + V(3) + Q(4) + W(3) + Bg(3) + Ba(3) = 19? 
// Standard: P(3)+V(3)+Att(3)+Bg(3)+Ba(3) = 15.
// Let's stick to the Interface definition: x(15-18).
// Let's use 16 (P, V, Q, W, Bg, Ba) if we treat Q as 4 parameters.
// But covariance P will be 16x16.
const STATE_DIM = 19; // p3 v3 q4 w3 bg3 ba3

export class ExtendedKalmanFilter implements EKF {
    private x: math.Matrix; // State Vector [p, v, q, w, bg, ba]
    private P: math.Matrix; // Covariance Matrix
    private debugMode: boolean = false;

    constructor() {
        this.x = math.zeros([STATE_DIM, 1]) as math.Matrix;
        this.P = math.identity(STATE_DIM) as math.Matrix;
    }

    init(x0: EKFState, P0: number[][]): void {
        this.x = this.stateToVector(x0);
        this.P = math.matrix(P0);
    }

    predict(u: ControlInput, dt: number, Q_noise: number[][] = []): void {
        // 1. Predict State: x_pred = f(x, u)
        // We need a physics propagation function similar to RigidBody but using Estimator assumptions
        // (e.g. using bias-corrected IMU if we had it as input, but here we predict using model?)
        // WAIT. Standard AHRS/Sensors:
        // Predict step usually uses IMU as Control Input (u) to propagate state!
        // OR Predict uses Physics Model + Control Surfaces to guess state.

        // In this architecture:
        // Predict uses Control Inputs (Throttle/Surfaces) -> Dynamics Model -> x_pred.
        // Update uses Sensors (GPS, etc) -> Correction.
        // BUT gyro/accel are usually "inputs" to predict step in modern EKFs (Propagate with IMU), 
        // measuring gravity/rates directly.

        // HOWEVER, the Blueprint says: 
        // "Control Loop Contract: Reference -> Controller -> 6DOF -> Sensors -> EKF"
        // And Predict takes (u: ControlInput). So we are doing a "Model-Based Prediction", NOT "IMU-Driven Prediction".
        // This is valid for wind estimation etc, but harder for attitude tracking than IMU integration.
        // Let's stick to the Blueprint: Predict using Dynamics Model.

        const state0 = this.vectorToState(this.x);

        // Simple Euler integration of x_dot = f(x, u)
        // We can reuse logic from dynamics.ts roughly, but here explicitly for jacobians.
        // Let's use a simplified motion model for EKF to avoid circular dependency or heavy compute?
        // Or better: Re-implement simplified dynamics here.

        const x_pred = this.f(state0, u, dt);

        // 2. Jacobian F = df/dx
        const F = this.computeJacobianF(state0, u, dt);

        // 3. Predict P: P = F*P*F' + Q
        const Qt = Q_noise.length > 0 ? math.matrix(Q_noise) : math.multiply(math.identity(STATE_DIM), 0.001); // Default small noise

        const F_mat = math.matrix(F);
        // P = F * P * F' + Q
        const FP = math.multiply(F_mat, this.P);
        const FP_Ft = math.multiply(FP, math.transpose(F_mat));
        this.P = math.add(FP_Ft, Qt) as math.Matrix;

        this.x = this.stateToVector(x_pred);
    }

    update(z_meas: Measurement, H_in?: number[][]): void {
        const z = math.matrix(z_meas.z).resize([z_meas.z.length, 1]);
        const R = math.matrix(z_meas.R);

        // 1. Observation Model h(x)
        // Depends on what sensor it is. 
        // If H is provided (linear approx), we use it.
        // Ideally we need expected measurement z_pred from current state.
        // For GPS (pos): z_pred = x.pos

        // We need z_pred to compute Innovation y = z - z_pred
        // But the interface passed only H.
        // Assuming Linear Measurement: z = H * x

        // Refinement: The Interface allows H. 
        // If Generic, we assum z_meas contains everything or we assume linear z = Hx.
        // Let's assume Linear Z = H*x for now as per "Jacobian H" passing.

        if (!H_in) {
            console.warn("EKF Update called without Jacobian H. Skipping.");
            return;
        }

        const H = math.matrix(H_in);

        // y = z - Hx
        const Hx = math.multiply(H, this.x);
        const y = math.subtract(z, Hx);

        // S = HPH' + R
        const HP = math.multiply(H, this.P);
        const HPHt = math.multiply(HP, math.transpose(H));
        const S = math.add(HPHt, R);

        // K = PH'S^-1
        const PHt = math.multiply(this.P, math.transpose(H));

        // Invert S. Mathjs inv()
        let S_inv;
        try {
            S_inv = math.inv(S);
        } catch (e) {
            console.error("Matrix inversion failed in EKF", e);
            return;
        }

        const K = math.multiply(PHt, S_inv);

        // x = x + Ky
        const Ky = math.multiply(K, y);
        this.x = math.add(this.x, Ky) as math.Matrix;

        // P = (I - KH)P
        const I = math.identity(STATE_DIM);
        const KH = math.multiply(K, H);
        const I_KH = math.subtract(I, KH);
        this.P = math.multiply(I_KH, this.P) as math.Matrix;
    }

    getEstimate(): EKFEstimate {
        return {
            xHat: this.vectorToState(this.x),
            P: (this.P.toArray() as any) as number[][],
            innovation: [] // TODO: Store last innovation
        };
    }

    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    // --- Helpers ---

    private vectorToState(v: math.Matrix | number[] | any): EKFState {
        let data: number[] = [];

        if (v && typeof v.toArray === 'function') {
            data = (v.toArray() as any).flat();
        } else if (Array.isArray(v)) {
            data = v.flat(Infinity) as number[];
        } else if (v && v.data && Array.isArray(v.data)) {
            // Handle raw matrix data object
            data = v.data.flat(Infinity);
        } else {
            console.error("vectorToState received invalid input:", v);
            // Return zero state to prevent crash
            data = new Array(STATE_DIM).fill(0);
        }

        return {
            p: { x: data[0] || 0, y: data[1] || 0, z: data[2] || 0 },
            v: { x: data[3] || 0, y: data[4] || 0, z: data[5] || 0 },
            q: { x: data[6] || 0, y: data[7] || 0, z: data[8] || 0, w: data[9] || 1 },
            w: { x: data[10] || 0, y: data[11] || 0, z: data[12] || 0 },
            b_g: { x: data[13] || 0, y: data[14] || 0, z: data[15] || 0 },
            b_a: { x: data[16] || 0, y: data[17] || 0, z: data[18] || 0 }
        };
    }

    private stateToVector(s: EKFState): math.Matrix {
        return math.transpose(math.matrix([[
            s.p.x, s.p.y, s.p.z,
            s.v.x, s.v.y, s.v.z,
            s.q.x, s.q.y, s.q.z, s.q.w,
            s.w.x, s.w.y, s.w.z,
            s.b_g.x, s.b_g.y, s.b_g.z,
            s.b_a.x, s.b_a.y, s.b_a.z
        ]])) as math.Matrix;
    }

    // Physics Propagation Model f(x, u) -> x_next
    private f(state: EKFState, u: ControlInput, dt: number): EKFState {
        // Simplified prediction model
        // p_dot = v (rotated to inertial?) 
        // Wait, State v is Body Frame? Yes per Interface.
        // p_dot = q * v * q'

        const v_inertial = Vec3.transformBodyToInertial(state.v, state.q);
        const p_new = Vec3.add(state.p, Vec3.scale(v_inertial, dt));

        // v_dot = Forces/m - w x v 
        // Here we don't have forces efficiently without full aero. 
        // Simplification for EKF Prediction: Constant Velocity or Simple Damping?
        // "Model-based" means we SHOULD calculate forces.
        // If that's too expensive/complex here (dependency loop), 
        // we assume just Gyro/Accel (IMU) drives prediction if available?
        // But we strictly defined architecture: Sensors come AFTER Sim.

        // Decision: PREDICT step assumes "Constant Velocity / Constant Turn" 
        // + Bias drift.
        // Update step corrects it with GPS/IMU.
        // This is a "Kinematic EKF".
        // If we want "Dynamic EKF", we need the aero model here.
        // Let's do Kinematic for stability first.

        // Kinematic Prediction:
        // Position changes by Velocity.
        // Velocity changes by... zero? (Constant Body Velocity assumption?)
        // Or assume w is constant?

        // Actually, if we have IMU as 'Measurement', then Kinematic model is:
        // x_pred relies on previous state.

        // Let's assume Constant Velocity, Constant (Damped) Rates.
        const v_new = state.v;
        const w_new = state.w;

        // Attitude integration
        const q_new = Quat.integrate(state.q, state.w, dt);

        // Biases = Random Walk (constant for mean prediction)
        const bg_new = state.b_g;
        const ba_new = state.b_a;

        return {
            p: p_new,
            v: v_new,
            q: q_new,
            w: w_new,
            b_g: bg_new,
            b_a: ba_new
        };
    }

    // Numerical Jacobian F
    private computeJacobianF(state: EKFState, u: ControlInput, dt: number): number[][] {
        const eps = 1e-5;
        const x0 = this.stateToVector(state);
        const N = STATE_DIM;
        const F = (math.identity(N) as any).toArray() as number[][]; // Init with identity? No, calculate it.
        // F_ij = (f_i(x+eps) - f_i(x-eps)) / 2eps

        // Base prediction
        // const f0 = this.stateToVector(this.f(state, u, dt));

        for (let j = 0; j < N; j++) {
            // Perturb +
            const x_plus = x0.clone();
            const val_p = x_plus.get([j, 0]);
            x_plus.set([j, 0], val_p + eps);
            const state_plus = this.vectorToState(x_plus);
            const f_plus = this.stateToVector(this.f(state_plus, u, dt));

            // Perturb -
            const x_minus = x0.clone();
            const val_m = x_minus.get([j, 0]);
            x_minus.set([j, 0], val_m - eps);
            const state_minus = this.vectorToState(x_minus);
            const f_minus = this.stateToVector(this.f(state_minus, u, dt));

            // Diff
            const diff = math.subtract(f_plus, f_minus);
            const deriv = math.multiply(diff, 1 / (2 * eps)) as math.Matrix;

            // Fill Column j
            const col = (deriv.toArray() as any).flat() as number[];
            for (let i = 0; i < N; i++) {
                F[i][j] = col[i];
            }
        }

        return F;
    }
}
