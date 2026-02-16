import { Matrix, EigenvalueDecomposition, SingularValueDecomposition, inverse } from "ml-matrix";
import { SimulationEngine } from "../simulation/simulation-engine";

export interface ValidationSnapshot {
    trimId: string;
    F: number[][];
    consistency: {
        nees: number;
        nis: number;
        bounds: {
            nees95: number;
            nis95: number;
        };
    };
    observability: {
        singularValues: number[];
        weakestDirection: number[];
        rank: number;
    };
    covariance: {
        eigenVectors: number[][];
        eigenValues: number[];
    };
}

function posCovarianceFromEstimate(cov: number[][] | undefined): Matrix {
    if (!cov || cov.length < 3 || cov[0].length < 3) return Matrix.eye(3);
    return new Matrix([
        [cov[0][0], cov[0][1], cov[0][2]],
        [cov[1][0], cov[1][1], cov[1][2]],
        [cov[2][0], cov[2][1], cov[2][2]]
    ]);
}

export class ValidationEngine {
    private readonly stateDim = 9;
    private readonly measDim = 3;
    private readonly CHI2_NEES_LOWER = 2.70;
    private readonly CHI2_NEES_UPPER = 19.02;
    private readonly CHI2_NIS_LOWER = 0.35;
    private readonly CHI2_NIS_UPPER = 7.81;

    private stateToVector(s: ReturnType<SimulationEngine["getRenderState"]>): number[] {
        return [
            s.p.x, s.p.y, s.p.z,
            s.v.x, s.v.y, s.v.z,
            s.b_g.x, s.b_g.y, s.b_g.z
        ];
    }

    private vectorToState(
        v: number[],
        template: ReturnType<SimulationEngine["getRenderState"]>
    ): ReturnType<SimulationEngine["getRenderState"]> {
        return {
            ...template,
            p: { x: v[0], y: v[1], z: v[2] },
            v: { x: v[3], y: v[4], z: v[5] },
            b_g: { x: v[6], y: v[7], z: v[8] }
        };
    }

    private computeSystemMatrix(
        simEngine: SimulationEngine,
        state: ReturnType<SimulationEngine["getRenderState"]>,
        dt: number
    ): Matrix {
        const epsilon = 1e-4;
        const F = new Matrix(this.stateDim, this.stateDim);
        const x0 = this.stateToVector(state);

        for (let i = 0; i < this.stateDim; i++) {
            const xPlus = [...x0];
            xPlus[i] += epsilon;
            const xMinus = [...x0];
            xMinus[i] -= epsilon;

            const nextPlus = simEngine.predictDeterminstic(this.vectorToState(xPlus, state), dt);
            const nextMinus = simEngine.predictDeterminstic(this.vectorToState(xMinus, state), dt);
            const vPlus = this.stateToVector(nextPlus);
            const vMinus = this.stateToVector(nextMinus);

            for (let j = 0; j < this.stateDim; j++) {
                F.set(j, i, (vPlus[j] - vMinus[j]) / (2 * epsilon));
            }
        }

        return F;
    }

    private computeMeasurementMatrix(): Matrix {
        const H = new Matrix(this.measDim, this.stateDim);
        H.set(0, 0, 1);
        H.set(1, 1, 1);
        H.set(2, 2, 1);
        return H;
    }

    private analyzeObservability(F: Matrix, H: Matrix): { rank: number; singularValues: number[]; weakestDirection: number[] } {
        const O = new Matrix(this.measDim * this.stateDim, this.stateDim);
        for (let r = 0; r < this.measDim; r++) {
            for (let c = 0; c < this.stateDim; c++) O.set(r, c, H.get(r, c));
        }

        let currentF = Matrix.eye(this.stateDim);
        for (let k = 1; k < this.stateDim; k++) {
            currentF = currentF.mmul(F);
            const block = H.mmul(currentF);
            const startRow = k * this.measDim;
            for (let r = 0; r < this.measDim; r++) {
                for (let c = 0; c < this.stateDim; c++) O.set(startRow + r, c, block.get(r, c));
            }
        }

        const svd = new SingularValueDecomposition(O);
        const singularValues = svd.diagonal;
        const V = svd.rightSingularVectors;
        const tol = 1e-4;
        let rank = 0;
        for (const s of singularValues) if (s > tol) rank++;

        const weakestIdx = singularValues.indexOf(Math.min(...singularValues));
        const weakestDirection = V.getColumn(weakestIdx);
        return { rank, singularValues, weakestDirection };
    }

    private computeMetrics(estState: number[], trueState: number[], P: Matrix, innov: number[], S: Matrix) {
        const e = new Matrix(estState.map((v, i) => [v - trueState[i]]));
        const nees = e.transpose().mmul(inverse(P)).mmul(e).get(0, 0);
        const v = new Matrix(innov.map((x) => [x]));
        const nis = v.transpose().mmul(inverse(S)).mmul(v).get(0, 0);

        return {
            nees,
            nis,
            neesBounds: [this.CHI2_NEES_LOWER, this.CHI2_NEES_UPPER] as [number, number],
            nisBounds: [this.CHI2_NIS_LOWER, this.CHI2_NIS_UPPER] as [number, number]
        };
    }

    public async runSnapshot(simEngine: SimulationEngine): Promise<ValidationSnapshot> {
        const truth = simEngine.getRenderState(0);
        const core = simEngine.getCoreState();
        const est = core.estimate;

        const F = this.computeSystemMatrix(simEngine, truth, 0.05);
        const H = this.computeMeasurementMatrix();
        const obs = this.analyzeObservability(F, H);

        const truePos = [truth.p.x, truth.p.y, truth.p.z];
        const estPos = est?.state?.slice(9, 12) ?? truePos;
        const P3 = posCovarianceFromEstimate(est?.covariance);
        const innov = truePos.map((v, i) => v - estPos[i]);
        const S = P3.add(Matrix.eye(3).mul(25));
        const metrics = this.computeMetrics(estPos, truePos, P3, innov, S);

        const eig = new EigenvalueDecomposition(P3);
        const evals = eig.realEigenvalues.map((v) => Math.max(1e-6, v));
        const evecs = eig.eigenvectorMatrix.to2DArray();
        const minIdx = evals.indexOf(Math.min(...evals));
        const weakest = [evecs[0][minIdx], evecs[1][minIdx], evecs[2][minIdx]];

        return {
            trimId: "Current operating point",
            F: F.to2DArray(),
            consistency: {
                nees: metrics.nees,
                nis: metrics.nis,
                bounds: { nees95: metrics.neesBounds[1], nis95: metrics.nisBounds[1] }
            },
            observability: {
                singularValues: obs.singularValues,
                weakestDirection: weakest,
                rank: obs.rank
            },
            covariance: {
                eigenVectors: evecs,
                eigenValues: evals.map((v) => Math.sqrt(v))
            }
        };
    }

    public async runMonteCarlo(simEngine: SimulationEngine, runs = 10, attackAlpha = 0): Promise<ValidationSnapshot> {
        // Deterministic batch: repeat short horizons with fixed perturbations, no random noise.
        let neesAcc = 0;
        let nisAcc = 0;
        let count = 0;
        const base = await this.runSnapshot(simEngine);

        for (let r = 0; r < runs; r++) {
            const sign = r % 2 === 0 ? 1 : -1;
            simEngine.setControls({
                elevator: sign * 0.01 * (1 + attackAlpha * 0.1),
                aileron: -sign * 0.005 * (1 + attackAlpha * 0.1)
            });
            for (let k = 0; k < 20; k++) simEngine.update(0.05);
            const snap = await this.runSnapshot(simEngine);
            neesAcc += snap.consistency.nees;
            nisAcc += snap.consistency.nis;
            count++;
        }

        const nees = count > 0 ? neesAcc / count : base.consistency.nees;
        const nis = count > 0 ? nisAcc / count : base.consistency.nis;
        return {
            ...base,
            consistency: {
                nees,
                nis,
                bounds: base.consistency.bounds
            }
        };
    }
}

export const validationEngine = new ValidationEngine();
