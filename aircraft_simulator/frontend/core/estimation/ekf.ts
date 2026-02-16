
import { AircraftConfig } from "../aircraft/aircraft";
import { Aerodynamics } from "../aerodynamics/aerodynamics";
import { RigidBody } from "../dynamics/rigid-body";
import { CESSNA_172R } from "../aircraft/database/cessna172";
import * as math from "mathjs";

// EKF State Vector [u, v, w, p, q, r, phi, theta, psi, x, y, z] (12)
// For biases we might extend later. 
// Let's stick to 12.

export class EKF {
    private x: number[]; // Estimate
    private P: number[][]; // Covariance

    // Process Noise Q
    private Q: number[][];
    // Measurement Noise R
    private R: number[][];

    // Physics Models
    private rigidBody: RigidBody;
    private aero: Aerodynamics;

    constructor(config: AircraftConfig = CESSNA_172R) {
        this.x = new Array(12).fill(0);
        this.x[0] = 60; // Initial guess V
        this.x[11] = -1000; // Initial guess H

        // Initial customized covariance
        // High uncertainty in pos/vel, low in rates/attitude?
        this.P = this.createDiagonalMatrix(12, 1.0);

        // Process Noise (Model Uncertainty)
        this.Q = this.createDiagonalMatrix(12, 0.01);

        // Measurement Noise (Sensor Uncertainty)
        // Assume GPS Pos (3) + Att (3) = 6 measurements? Or just GPS?
        // Let's assume full state measurement for simplicity first or standard GPS+AHRS.
        // Let's assume standard AHRS+GPS: [u,v,w, p,q,r, phi,theta,psi, x,y,z] all measured?
        // Realistically: GPS gives x,y,z, u_g, v_g. AHRS gives p,q,r, phi,theta,psi.
        // Let's assume we measure everything (M=12) for Tier 1 simplicity, 
        // to show "Sensor Fusion" cleaning up noise.
        this.R = this.createDiagonalMatrix(12, 0.1);

        this.rigidBody = new RigidBody(config);
        this.aero = new Aerodynamics(config);
    }

    public init(initialState: number[], initialP?: number[][]) {
        this.x = [...initialState];
        if (initialP) this.P = initialP;
    }

    public predict(controls: any, dt: number) {
        // 1. Predict State: x_pred = f(x, u)
        // We use the rigorous RigidBody equations!
        // But we need to integrate them. Euler for simplicity in EKF prediction step is standard.
        // x_dot = RE.equationsOfMotion(t, x, forces)

        // Compute forces
        const { F, M } = this.aero.calculateForcesAndMoments(this.x, controls);

        // Compute Derivatives
        const x_dot = this.rigidBody.equationsOfMotion(0, this.x, {
            Fx: F[0], Fy: F[1], Fz: F[2],
            Mx: M[0], My: M[1], Mz: M[2]
        });

        // Euler Integrate
        const x_pred = this.x.map((val, i) => val + x_dot[i] * dt);

        // 2. Jacobian F = df/dx
        // Numerical Jacobian around current estimate
        const F_jac = this.computeJacobian(this.x, controls, dt);

        // 3. Predict Covariance: P = F P F' + Q
        const Fw = math.matrix(F_jac);
        const Pw = math.matrix(this.P);
        const Qw = math.matrix(this.Q);

        // Discrete time update: P = F*P*F' + Q
        // (Note: F_jac here is continuous A? Or discrete transition Phi?
        // EKF usually needs Phi = I + A*dt.
        // My computeJacobian below likely returns A (rates).
        // Let's ensure it returns Discrete Transition Matrix.)

        const F_discrete = F_jac.map((row, i) => row.map((val, j) => (i === j ? 1 : 0) + val * dt));
        const Fd_mat = math.matrix(F_discrete);

        const P_pred = math.add(
            math.multiply(math.multiply(Fd_mat, Pw), math.transpose(Fd_mat)),
            Qw
        );

        this.x = x_pred;
        this.P = (P_pred as any).toArray();
    }

    public update(z: number[]) {
        // z: Measurement Vector (12)
        // x: State Vector (12)
        // H: Measurement Model (Identity for full state measurement)

        const z_mat = math.matrix(z).resize([12, 1]);
        const x_mat = math.matrix(this.x).resize([12, 1]);
        const P_mat = math.matrix(this.P);
        const R_mat = math.matrix(this.R);
        const H_mat = math.identity(12); // Assume direct measurement of all states for this stage

        // Innovation y = z - Hx
        const y = math.subtract(z_mat, math.multiply(H_mat, x_mat));

        // Innovation Covariance S = H P H' + R
        const S = math.add(
            math.multiply(math.multiply(H_mat, P_mat), math.transpose(H_mat)),
            R_mat
        );

        // Kalman Gain K = P H' S^-1
        const PHt = math.multiply(P_mat, math.transpose(H_mat));
        let S_inv: any;
        try {
            S_inv = math.inv(S);
        } catch (e) {
            console.error("Matrix Inversion Failed", e);
            return;
        }

        const K = math.multiply(PHt, S_inv);

        // Update State x = x + Ky
        const Ky = math.multiply(K, y);
        const x_new = math.add(x_mat, Ky);

        // Update Covariance P = (I - KH)P
        const I = math.identity(12);
        const KH = math.multiply(K, H_mat);
        const I_KH = math.subtract(I, KH as any); // Type assertion for subtraction
        const P_new = math.multiply(
            I_KH,
            P_mat
        );

        this.x = (x_new as any).toArray().flat();
        this.P = (P_new as any).toArray();
    }

    public getEstimate() {
        return {
            state: this.x,
            covariance: this.P,
            innovation: []
        };
    }

    // --- Helpers ---

    private computeJacobian(state: number[], controls: any, dt: number): number[][] {
        // Reuse exact logic from linearization but locally
        const n = 12;
        const A: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
        const eps = 1e-4;

        const getDerivs = (s: number[]) => {
            const { F, M } = this.aero.calculateForcesAndMoments(s, controls);
            return this.rigidBody.equationsOfMotion(0, s, { Fx: F[0], Fy: F[1], Fz: F[2], Mx: M[0], My: M[1], Mz: M[2] });
        };

        const f0 = getDerivs(state);

        for (let i = 0; i < n; i++) {
            const s_pert = [...state];
            s_pert[i] += eps;
            const f = getDerivs(s_pert);
            for (let j = 0; j < n; j++) {
                A[j][i] = (f[j] - f0[j]) / eps;
            }
        }
        return A;
    }

    private createDiagonalMatrix(size: number, val: number): number[][] {
        const m: number[][] = [];
        for (let i = 0; i < size; i++) {
            const row = new Array(size).fill(0);
            row[i] = val;
            m.push(row);
        }
        return m;
    }
}
