import * as math from "mathjs"; // Assuming we can use mathjs for matrix ops if needed

export class LQR {
    private K: number[][] | null = null;

    constructor(initialK?: number[][]) {
        this.K = initialK || null;
    }

    public hasGain(): boolean {
        return this.K !== null;
    }

    public getGain(): number[][] | null {
        return this.K ? this.K.map((row) => [...row]) : null;
    }

    public computeGain(A: number[][], B: number[][], Q: number[][], R: number[][]): number[][] {
        const A_mat = math.matrix(A);
        const B_mat = math.matrix(B);
        const Q_mat = math.matrix(Q);
        const R_mat = math.matrix(R);

        let P = math.matrix(Q);
        const maxIter = 500;
        const tol = 1e-8;

        for (let k = 0; k < maxIter; k++) {
            const BtP = math.multiply(math.transpose(B_mat), P);
            const S = math.add(R_mat, math.multiply(BtP, B_mat));
            const S_inv = math.inv(S);
            const AtP = math.multiply(math.transpose(A_mat), P);
            const AtPA = math.multiply(AtP, A_mat);
            const AtPB = math.multiply(AtP, B_mat);
            const BtPA = math.multiply(BtP, A_mat);
            const correction = math.multiply(math.multiply(AtPB, S_inv), BtPA);
            const P_next = math.add(math.subtract(AtPA, correction), Q_mat) as math.Matrix;

            const delta = math.subtract(P_next, P) as math.Matrix;
            const deltaArr = delta.toArray() as number[][];
            let normInf = 0.0;
            for (const row of deltaArr) {
                for (const v of row) normInf = Math.max(normInf, Math.abs(v));
            }
            P = P_next;
            if (normInf < tol) break;
        }

        const K_mat = math.multiply(
            math.inv(math.add(R_mat, math.multiply(math.multiply(math.transpose(B_mat), P), B_mat))),
            math.multiply(math.multiply(math.transpose(B_mat), P), A_mat)
        ) as math.Matrix;

        this.K = K_mat.toArray() as number[][];
        return this.K.map((row) => [...row]);
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
        const outArr = (Array.isArray(u_out) ? u_out : math.matrix(u_out).toArray()) as unknown[];
        return outArr.flatMap((v) => (Array.isArray(v) ? (v as number[]) : [Number(v)]));
    }
}
