/**
 * CONSISTENCY METRICS
 * NEES (Normalized Estimation Error Squared) and NIS (Normalized Innovation Squared)
 * for EKF consistency checking.
 * 
 * Reference: Bar-Shalom, "Estimation with Applications to Tracking and Navigation"
 */

/**
 * NEES — Tests if true state is consistent with estimated covariance
 * 
 * NEES = (x - x̂)ᵀ P⁻¹ (x - x̂)
 * 
 * Under correct estimation, NEES ~ χ²(n) where n = state dimension
 */
export function computeNEES(
    trueState: number[],
    estimatedState: number[],
    covarianceMatrix: number[][]
): number {
    const n = trueState.length;
    const error: number[] = [];

    for (let i = 0; i < n; i++) {
        error.push(trueState[i] - estimatedState[i]);
    }

    // Invert covariance matrix (simple for now — real impl should use Cholesky)
    const Pinv = invertMatrix(covarianceMatrix);
    if (!Pinv) return NaN;

    // Compute error^T * P^-1 * error
    let nees = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            nees += error[i] * Pinv[i][j] * error[j];
        }
    }

    return nees;
}

/**
 * NIS — Tests if innovation (residual) is consistent with innovation covariance
 * 
 * NIS = rᵀ S⁻¹ r
 * 
 * Under correct estimation, NIS ~ χ²(m) where m = measurement dimension
 */
export function computeNIS(
    innovation: number[],
    innovationCovariance: number[][]
): number {
    const m = innovation.length;

    const Sinv = invertMatrix(innovationCovariance);
    if (!Sinv) return NaN;

    let nis = 0;
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) {
            nis += innovation[i] * Sinv[i][j] * innovation[j];
        }
    }

    return nis;
}

/**
 * Chi-squared confidence bounds
 * For consistency checking: NEES should be within [lower, upper] 95% of time
 */
export function getChiSquaredBounds(
    dof: number,
    confidence: number = 0.95
): { lower: number; upper: number } {
    // Approximate chi-squared quantiles for common cases
    // For exact values, use statistical library
    const alpha = 1 - confidence;

    // Simplified lookup table for common degrees of freedom
    const table: Record<number, { lower: number; upper: number }> = {
        1: { lower: 0.001, upper: 3.84 },
        3: { lower: 0.22, upper: 7.81 },
        6: { lower: 1.24, upper: 12.59 },
        9: { lower: 2.70, upper: 16.92 },
        12: { lower: 4.40, upper: 21.03 },
        15: { lower: 6.26, upper: 25.00 },
    };

    if (table[dof]) {
        return table[dof];
    }

    // Approximation for other DoF (Wilson-Hilferty)
    const z95 = 1.96;
    const mean = dof;
    const variance = 2 * dof;
    const stdDev = Math.sqrt(variance);

    return {
        lower: Math.max(0, mean - z95 * stdDev),
        upper: mean + z95 * stdDev
    };
}

/**
 * Simple matrix inversion (for small matrices, < 6x6)
 * Uses Gaussian elimination with partial pivoting
 */
function invertMatrix(matrix: number[][]): number[][] | null {
    const n = matrix.length;

    // Create augmented matrix [A | I]
    const aug: number[][] = [];
    for (let i = 0; i < n; i++) {
        aug[i] = [...matrix[i]];
        for (let j = 0; j < n; j++) {
            aug[i].push(i === j ? 1 : 0);
        }
    }

    // Forward elimination
    for (let col = 0; col < n; col++) {
        // Find pivot
        let maxRow = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                maxRow = row;
            }
        }
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

        if (Math.abs(aug[col][col]) < 1e-12) {
            return null; // Singular matrix
        }

        // Scale pivot row
        const pivot = aug[col][col];
        for (let j = 0; j < 2 * n; j++) {
            aug[col][j] /= pivot;
        }

        // Eliminate column
        for (let row = 0; row < n; row++) {
            if (row !== col) {
                const factor = aug[row][col];
                for (let j = 0; j < 2 * n; j++) {
                    aug[row][j] -= factor * aug[col][j];
                }
            }
        }
    }

    // Extract inverse
    const inv: number[][] = [];
    for (let i = 0; i < n; i++) {
        inv[i] = aug[i].slice(n);
    }

    return inv;
}

/**
 * Tracking data for NEES/NIS history (for plotting)
 */
export interface ConsistencyHistory {
    time: number[];
    nees: number[];
    nis: number[];
    neesUpperBound: number;
    neesLowerBound: number;
    nisUpperBound: number;
    nisLowerBound: number;
}

export class ConsistencyTracker {
    private history: ConsistencyHistory;
    private stateDof: number;
    private measurementDof: number;

    constructor(stateDof: number, measurementDof: number) {
        this.stateDof = stateDof;
        this.measurementDof = measurementDof;

        const neesBounds = getChiSquaredBounds(stateDof);
        const nisBounds = getChiSquaredBounds(measurementDof);

        this.history = {
            time: [],
            nees: [],
            nis: [],
            neesUpperBound: neesBounds.upper,
            neesLowerBound: neesBounds.lower,
            nisUpperBound: nisBounds.upper,
            nisLowerBound: nisBounds.lower
        };
    }

    record(
        t: number,
        trueState: number[],
        estimatedState: number[],
        covariance: number[][],
        innovation: number[],
        innovationCov: number[][]
    ): void {
        const nees = computeNEES(trueState, estimatedState, covariance);
        const nis = computeNIS(innovation, innovationCov);

        this.history.time.push(t);
        this.history.nees.push(nees);
        this.history.nis.push(nis);

        // Limit history length
        const maxLen = 1000;
        if (this.history.time.length > maxLen) {
            this.history.time.shift();
            this.history.nees.shift();
            this.history.nis.shift();
        }
    }

    getHistory(): ConsistencyHistory {
        return this.history;
    }

    clear(): void {
        this.history.time = [];
        this.history.nees = [];
        this.history.nis = [];
    }

    /**
     * Compute percentage of NEES values within bounds
     */
    getNEESConsistency(): number {
        if (this.history.nees.length === 0) return 1;

        const inBounds = this.history.nees.filter(
            n => n >= this.history.neesLowerBound && n <= this.history.neesUpperBound
        ).length;

        return inBounds / this.history.nees.length;
    }
}
