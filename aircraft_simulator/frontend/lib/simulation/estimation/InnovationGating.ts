/**
 * INNOVATION GATING
 * Rejects measurements whose innovation (residual) is statistically unlikely.
 * 
 * Math: If NIS = r^T S^-1 r exceeds χ²(m, α) threshold, reject measurement.
 * 
 * This prevents corrupted measurements (bias, outliers) from polluting the filter.
 */

import { Measurement } from "../types/sensors";

export interface GatingConfig {
    // Significance level (default 0.01 = 99% confidence)
    alpha: number;
    // Maximum allowed NIS (chi-squared threshold)
    // Computed from degrees of freedom and alpha
    nisThreshold: number;
    // Enable/disable gating
    enabled: boolean;
}

export interface GatingResult {
    accepted: boolean;
    nis: number;
    threshold: number;
    rejectionCount: number;
}

/**
 * Chi-squared critical values for common DoF and α = 0.01
 */
const CHI2_99: Record<number, number> = {
    1: 6.63,
    2: 9.21,
    3: 11.34,
    6: 16.81,
    9: 21.67
};

export class InnovationGate {
    private config: GatingConfig;
    private rejectionCount: number = 0;
    private recentGatingResults: GatingResult[] = [];

    constructor(measurementDim: number = 3, alpha: number = 0.01) {
        this.config = {
            alpha,
            nisThreshold: CHI2_99[measurementDim] || 11.34,
            enabled: true
        };
    }

    /**
     * Test if a measurement should be accepted
     */
    test(
        innovation: number[],
        innovationCovariance: number[][]
    ): GatingResult {
        if (!this.config.enabled) {
            return { accepted: true, nis: 0, threshold: this.config.nisThreshold, rejectionCount: this.rejectionCount };
        }

        // Compute NIS = r^T S^-1 r
        const nis = this.computeNIS(innovation, innovationCovariance);

        const accepted = nis <= this.config.nisThreshold;

        if (!accepted) {
            this.rejectionCount++;
        }

        const result: GatingResult = {
            accepted,
            nis,
            threshold: this.config.nisThreshold,
            rejectionCount: this.rejectionCount
        };

        // Track recent results for diagnostics
        this.recentGatingResults.push(result);
        if (this.recentGatingResults.length > 100) {
            this.recentGatingResults.shift();
        }

        return result;
    }

    /**
     * Compute NIS (Normalized Innovation Squared)
     */
    private computeNIS(innovation: number[], S: number[][]): number {
        const m = innovation.length;

        // Simple inversion for small matrices
        const Sinv = this.invertMatrix(S);
        if (!Sinv) return Infinity; // Singular covariance → reject

        let nis = 0;
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < m; j++) {
                nis += innovation[i] * Sinv[i][j] * innovation[j];
            }
        }

        return nis;
    }

    /**
     * Simple matrix inversion (Gaussian elimination)
     */
    private invertMatrix(matrix: number[][]): number[][] | null {
        const n = matrix.length;
        const aug: number[][] = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

        for (let col = 0; col < n; col++) {
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
            }
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

            if (Math.abs(aug[col][col]) < 1e-12) return null;

            const pivot = aug[col][col];
            for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

            for (let row = 0; row < n; row++) {
                if (row !== col) {
                    const factor = aug[row][col];
                    for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
                }
            }
        }

        return aug.map(row => row.slice(n));
    }

    /**
     * Enable/disable gating
     */
    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
    }

    /**
     * Update threshold
     */
    setThreshold(threshold: number): void {
        this.config.nisThreshold = threshold;
    }

    /**
     * Get rejection rate
     */
    getRejectionRate(): number {
        if (this.recentGatingResults.length === 0) return 0;
        const rejected = this.recentGatingResults.filter(r => !r.accepted).length;
        return rejected / this.recentGatingResults.length;
    }

    /**
     * Get statistics for UI
     */
    getStats(): { rejectionCount: number; rejectionRate: number; recentNIS: number[] } {
        return {
            rejectionCount: this.rejectionCount,
            rejectionRate: this.getRejectionRate(),
            recentNIS: this.recentGatingResults.map(r => r.nis)
        };
    }

    /**
     * Reset statistics
     */
    reset(): void {
        this.rejectionCount = 0;
        this.recentGatingResults = [];
    }
}

// Singleton instance
export const innovationGate = new InnovationGate(3);
