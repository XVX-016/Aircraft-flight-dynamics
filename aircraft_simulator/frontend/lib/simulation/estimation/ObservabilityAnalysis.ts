/**
 * OBSERVABILITY ANALYSIS
 * Computes observability metrics for the EKF to identify which states
 * are well-observed vs poorly-observed at any given time.
 * 
 * Key insight: If a state is weakly observable, the estimator can diverge
 * without the innovation magnitude increasing (stealth divergence).
 * 
 * Math: Observability Gramian W_o = ∫ φ^T H^T R^-1 H φ dt (discrete approximation)
 * State observability index = eigenvalues of P^-1 (covariance)
 */

export interface ObservabilityMetrics {
    // Per-state observability index (0-1, higher = more observable)
    stateObservability: number[];
    // Overall system observability (determinant of gramian, log scale)
    systemObservability: number;
    // Weakest observed state index
    weakestStateIndex: number;
    // State labels for display
    stateLabels: string[];
}

const STATE_LABELS = [
    'px', 'py', 'pz',  // Position
    'vx', 'vy', 'vz',  // Velocity
    'qw', 'qx', 'qy', 'qz',  // Quaternion
    'wx', 'wy', 'wz',  // Angular rates
    'bgx', 'bgy', 'bgz',  // Gyro bias
    'bax', 'bay', 'baz'   // Accel bias
];

export class ObservabilityAnalyzer {
    private history: ObservabilityMetrics[] = [];
    private maxHistory: number = 100;

    /**
     * Compute observability from measurement Jacobian and covariance
     * 
     * Simplified approach: Use P^-1 diagonal as proxy for information content
     */
    computeFromCovariance(P: number[][]): ObservabilityMetrics {
        const n = P.length;
        const stateObservability: number[] = [];

        // Observability proxy: 1 / sqrt(P_ii)
        // Higher variance = lower observability
        for (let i = 0; i < n; i++) {
            const variance = P[i]?.[i] ?? 1;
            // Normalize to 0-1 range (assuming variance between 0.001 and 1000)
            const obs = 1 / (1 + Math.sqrt(Math.max(variance, 0.001)));
            stateObservability.push(obs);
        }

        // System observability: geometric mean of state observabilities
        const product = stateObservability.reduce((a, b) => a * b, 1);
        const systemObservability = Math.pow(product, 1 / n);

        // Find weakest state
        let weakestStateIndex = 0;
        let minObs = stateObservability[0];
        for (let i = 1; i < n; i++) {
            if (stateObservability[i] < minObs) {
                minObs = stateObservability[i];
                weakestStateIndex = i;
            }
        }

        const metrics: ObservabilityMetrics = {
            stateObservability,
            systemObservability,
            weakestStateIndex,
            stateLabels: STATE_LABELS.slice(0, n)
        };

        // Track history
        this.history.push(metrics);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        return metrics;
    }

    /**
     * Compute from measurement Jacobian (information content)
     * 
     * H^T R^-1 H gives information contribution per measurement
     */
    computeInformationContent(H: number[][], R: number[][]): number[] {
        const n = H[0]?.length ?? 0;
        const m = H.length;

        if (n === 0 || m === 0) return [];

        // Compute R^-1 (diagonal assumption for simplicity)
        const Rinv = R.map((row, i) =>
            row.map((val, j) => i === j ? 1 / (val + 1e-6) : 0)
        );

        // Compute H^T R^-1 H (simplified: diagonal approximation)
        const info: number[] = new Array(n).fill(0);

        for (let i = 0; i < n; i++) {
            for (let k = 0; k < m; k++) {
                const Hki = H[k]?.[i] ?? 0;
                const Rkkinv = Rinv[k]?.[k] ?? 0;
                info[i] += Hki * Hki * Rkkinv;
            }
        }

        return info;
    }

    /**
     * Get observability history for plotting
     */
    getHistory(): ObservabilityMetrics[] {
        return this.history;
    }

    /**
     * Get time series of system observability
     */
    getSystemObservabilityTimeSeries(): number[] {
        return this.history.map(m => m.systemObservability);
    }

    /**
     * Get weakest state over time
     */
    getWeakestStateTimeSeries(): string[] {
        return this.history.map(m => m.stateLabels[m.weakestStateIndex] || 'unknown');
    }

    /**
     * Clear history
     */
    reset(): void {
        this.history = [];
    }
}

// Singleton instance
export const observabilityAnalyzer = new ObservabilityAnalyzer();
