import { Matrix, SingularValueDecomposition, inverse } from 'ml-matrix';
import { SimulationEngine } from './simulation-engine';
import { TruthState } from './types/state';
import { GPS } from './estimation/sensors';

/**
 * REGULATOR-GRADE VALIDATION SYSTEM
 * 
 * Contract:
 * 1. Numerical Determinism: All math runs CPU-side (ml-matrix). No GPU compute.
 * 2. Immutable Snapshots: Validation does not mutate simulation state.
 * 3. Finite Horizon: Observability checked over N steps.
 * 4. Verification Aid: Outputs are diagnostic only (TQL-4).
 */

export interface ValidationMetrics {
    nees: number;
    nis: number;
    neesBounds: [number, number]; // 95% confidence
    nisBounds: [number, number];
    isConsistent: boolean;
}

export interface ObservabilityResult {
    rank: number;
    conditionNumber: number;
    unobservableModes: number[][]; // Null space basis vectors
    observableEnergy: number; // Smallest singular value
    singularValues: number[]; // Full spectrum
}

export interface ValidationSnapshot {
    trimId: string;
    F: number[][]; // Jacobian array
    consistency: {
        nees: number;
        nis: number;
        bounds: { nees95: number; nis95: number; };
    };
    observability: {
        singularValues: number[];
    };
}

export class ValidationSystem {
    private engine: SimulationEngine;
    private stateDim = 9; // p(3), v(3), b_g(3) - Simplified for EKF
    private measDim = 3;  // GPS(3)

    // Chi-square thresholds (95%)
    // NEES (9 DOF): [2.70, 19.02]
    private CHI2_NEES_LOWER = 2.70;
    private CHI2_NEES_UPPER = 19.02;

    // NIS (3 DOF): [0.35, 7.81]
    private CHI2_NIS_LOWER = 0.35;
    private CHI2_NIS_UPPER = 7.81;

    constructor(engine: SimulationEngine) {
        this.engine = engine;
    }

    /**
     * Compute Numerical Jacobian F = df/dx
     * Central Difference Method
     */
    public computeSystemMatrix(state: TruthState, dt: number): Matrix {
        const epsilon = 1e-4;
        const F = new Matrix(this.stateDim, this.stateDim);
        const x0 = this.stateToVector(state);

        for (let i = 0; i < this.stateDim; i++) {
            // High perturbation
            const xPlus = [...x0];
            xPlus[i] += epsilon;
            const statePlus = this.vectorToState(xPlus, state);
            const nextPlus = this.engine.predictDeterminstic(statePlus, dt); // We need to expose this in SimEngine

            // Low perturbation
            const xMinus = [...x0];
            xMinus[i] -= epsilon;
            const stateMinus = this.vectorToState(xMinus, state);
            const nextMinus = this.engine.predictDeterminstic(stateMinus, dt);

            // Derivative
            const vPlus = this.stateToVector(nextPlus);
            const vMinus = this.stateToVector(nextMinus);

            for (let j = 0; j < this.stateDim; j++) {
                F.set(j, i, (vPlus[j] - vMinus[j]) / (2 * epsilon));
            }
        }
        return F;
    }

    /**
     * Compute Measurement Jacobian H = dh/dx
     * Analytical (GPS is linear) or Numerical
     */
    public computeMeasurementMatrix(): Matrix {
        // GPS measures position directly: H = [I_3x3  0_3x3  0_3x3]
        const H = new Matrix(this.measDim, this.stateDim);
        H.set(0, 0, 1); H.set(1, 1, 1); H.set(2, 2, 1);
        return H;
    }

    /**
     * Finite-Horizon Observability Analysis
     * O = [H; HF; HF^2; ...; HF^(n-1)]
     */
    public analyzeObservability(F: Matrix, H: Matrix): ObservabilityResult {
        let O = H.clone();
        let F_pow = F.clone();

        // Build Observability Matrix (n steps)
        // O = [H; HF; HF^2; ...; HF^(n-1)]
        // Size: (measDim * stateDim) x stateDim
        const O_stacked = new Matrix(this.measDim * this.stateDim, this.stateDim);

        // Fill first block (H)
        for (let r = 0; r < this.measDim; r++) {
            for (let c = 0; c < this.stateDim; c++) {
                O_stacked.set(r, c, H.get(r, c));
            }
        }

        let currentF = Matrix.eye(this.stateDim);

        for (let k = 1; k < this.stateDim; k++) {
            // Update power of F
            currentF = currentF.mmul(F);

            // Compute HF^k
            const block = H.mmul(currentF);

            // Stack it
            const startRow = k * this.measDim;
            for (let r = 0; r < this.measDim; r++) {
                for (let c = 0; c < this.stateDim; c++) {
                    O_stacked.set(startRow + r, c, block.get(r, c));
                }
            }
        }

        // SVD on O_stacked
        const svd = new SingularValueDecomposition(O_stacked);
        const singularValues = svd.diagonal;
        const V = svd.rightSingularVectors;

        // Rank determination (tolerance-based)
        const tol = 1e-4;
        let rank = 0;
        const unobservableModes: number[][] = [];

        for (let i = 0; i < singularValues.length; i++) {
            if (singularValues[i] > tol) {
                rank++;
            } else {
                // This column of V is in null space
                unobservableModes.push(V.getColumn(i));
            }
        }

        return {
            rank,
            observableEnergy: Math.min(...singularValues),
            conditionNumber: svd.condition,
            unobservableModes,
            singularValues
        };
    }

    /**
     * Compute Consistency Metrics (NEES / NIS)
     */
    public computeMetrics(
        estState: number[],
        trueState: number[],
        P: Matrix,
        innov: number[],
        S: Matrix
    ): ValidationMetrics {
        // Error vector
        const e = new Matrix(estState.map((v, i) => v - trueState[i]).map(x => [x]));
        const P_inv = inverse(P);

        // NEES = e' * P^-1 * e
        const neesMat = e.transpose().mmul(P_inv).mmul(e);
        const nees = neesMat.get(0, 0);

        // NIS = v' * S^-1 * v
        const v = new Matrix(innov.map(x => [x]));
        const S_inv = inverse(S);
        const nisMat = v.transpose().mmul(S_inv).mmul(v);
        const nis = nisMat.get(0, 0);

        return {
            nees,
            nis,
            neesBounds: [this.CHI2_NEES_LOWER, this.CHI2_NEES_UPPER],
            nisBounds: [this.CHI2_NIS_LOWER, this.CHI2_NIS_UPPER],
            isConsistent: (nees >= this.CHI2_NEES_LOWER && nees <= this.CHI2_NEES_UPPER) &&
                (nis >= this.CHI2_NIS_LOWER && nis <= this.CHI2_NIS_UPPER)
        };
    }

    // --- Helpers ---
    private stateToVector(s: TruthState): number[] {
        return [
            s.p.x, s.p.y, s.p.z,
            s.v.x, s.v.y, s.v.z,
            s.b_g.x, s.b_g.y, s.b_g.z
        ];
    }

    private vectorToState(v: number[], template: TruthState): TruthState {
        return {
            ...template,
            p: { x: v[0], y: v[1], z: v[2] },
            v: { x: v[3], y: v[4], z: v[5] },
            b_g: { x: v[6], y: v[7], z: v[8] }
        };
    }
}

/**
 * Airworthiness Validation Logic
 */
export function validateState(orientation: [number, number, number], airspeed: number, altitude: number) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Max Bank (Roll) > 60 deg
    if (Math.abs(orientation[0]) > 1.047) errors.push("CRITICAL: Structural bank limit exceeded (>60°)");

    // Max Pitch > 30 deg
    if (Math.abs(orientation[1]) > 0.523) errors.push("CRITICAL: Unusual attitude (Pitch >30°)");

    // Stall Speed approx 45 m/s
    if (airspeed < 45) errors.push("WARNING: Airspeed below power-off stall speed");

    // Max Altitude 18,000 m
    if (altitude > 18000) errors.push("CRITICAL: Service ceiling exceeded");

    // Warnings
    if (airspeed > 250) warnings.push("Vne exceedance risk: reduce throttle");
    if (altitude < 100) warnings.push("Ground proximity alert");

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}
