import { Linearization } from "../analysis/linearization";
import { TrimResult } from "../analysis/trim";
import * as math from "mathjs"; // Assuming we can use mathjs for matrix ops if needed
// Actually, solving Riccati Equation (CARE) is hard in pure JS without specific decomposers.
// We will implement a simple Kleinman's algorithm or iterative solver if feasible, 
// OR just use a fixed K gain for the specific flight condition (Gain Scheduling).
// For this "Tier 1" undergrad project, computing K offline or using a simplified solver is acceptable.
// Let's implement a Discrete Time LQR solver since we have discrete steps?
// Or Continuous CARE solver via Newton's method.

export class LQR {
    private K: number[][] | null = null;
    private linearization: Linearization;

    constructor(initialK?: number[][]) {
        this.K = initialK || null;
        this.linearization = new Linearization();
    }

    public computeGain(A: number[][], B: number[][], Q: number[][], R: number[][]): number[][] {
        // Solves Continuous Algebraic Riccati Equation: A'P + PA - PBR^-1B'P + Q = 0
        // K = R^-1 B' P

        // Implementing a Kleinman/Newton iterative solver for CARE
        // 1. Initial stabilizing K0? or just integrate P_dot?
        // Integration is robust. P_dot = A'P + PA - PBR^-1B'P + Q
        // Simulate until steady state.

        const n = A.length;
        let P = math.zeros([n, n]) as math.Matrix;

        // Integration steps
        const dt = 0.01;
        const maxTime = 10.0; // Seconds to converge
        const steps = maxTime / dt;

        const At = math.transpose(math.matrix(A));
        const Bt = math.transpose(math.matrix(B));
        const R_inv = math.inv(math.matrix(R));
        const BRinvBt = math.multiply(math.multiply(math.matrix(B), R_inv), Bt); // B * R^-1 * B'
        const Q_mat = math.matrix(Q);

        for (let i = 0; i < steps; i++) {
            // P_dot = A'P + PA - P * S * P + Q
            const PA = math.multiply(P, math.matrix(A));
            const AtP = math.multiply(At, P);
            const P_S_P = math.multiply(math.multiply(P, BRinvBt), P);

            const P_dot = math.add(math.subtract(math.add(AtP, PA), P_S_P), Q_mat);

            // Euler step
            P = math.add(P, math.multiply(P_dot, dt)) as math.Matrix;
        }

        // K = R^-1 B' P
        const K_mat = math.multiply(math.multiply(R_inv, Bt), P);

        this.K = (K_mat.toArray() as any) as number[][];
        return this.K;
    }

    public update(state: number[], reference: number[]): number[] {
        if (!this.K) return [0, 0, 0, 0]; // No gain

        // u = -K * (x - x_ref)
        const error = state.map((val, i) => val - (reference[i] || 0));

        // K is (inputs x states)
        // u is (inputs x 1)

        const u = math.multiply(math.matrix(this.K), math.matrix(error).resize([error.length, 1]));

        // Negate for negative feedback? Standard is u = -Kx
        const u_out = math.multiply(u, -1);

        return (u_out.toArray() as any).flat() as number[];
    }
}
