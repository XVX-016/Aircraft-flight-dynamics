/**
 * ADAPTIVE R TUNING
 * Dynamically adjusts measurement noise covariance R based on innovation statistics.
 * 
 * When innovations are consistently larger than expected (bad measurements),
 * R is increased to reduce their influence. When innovations are small,
 * R is decreased to trust measurements more.
 */

export interface AdaptiveRConfig {
    // Innovation window size for statistics
    windowSize: number;
    // Adaptation rate (0-1, higher = faster adaptation)
    adaptationRate: number;
    // Minimum R multiplier
    minMultiplier: number;
    // Maximum R multiplier
    maxMultiplier: number;
    // Enable/disable adaptation
    enabled: boolean;
}

export interface AdaptiveRState {
    multiplier: number;
    innovationVariance: number;
    expectedVariance: number;
}

export class AdaptiveRTuner {
    private config: AdaptiveRConfig;
    private innovationHistory: number[][] = [];
    private currentMultiplier: number = 1.0;
    private baseR: number[][] | null = null;

    constructor(config?: Partial<AdaptiveRConfig>) {
        this.config = {
            windowSize: 20,
            adaptationRate: 0.1,
            minMultiplier: 0.5,
            maxMultiplier: 10.0,
            enabled: true,
            ...config
        };
    }

    /**
     * Initialize with base R matrix
     */
    setBaseR(R: number[][]): void {
        this.baseR = R.map(row => [...row]);
    }

    /**
     * Record an innovation and update R multiplier
     */
    update(innovation: number[], expectedS: number[][]): AdaptiveRState {
        if (!this.config.enabled) {
            return { multiplier: 1.0, innovationVariance: 0, expectedVariance: 0 };
        }

        // Add to history
        this.innovationHistory.push(innovation);
        if (this.innovationHistory.length > this.config.windowSize) {
            this.innovationHistory.shift();
        }

        // Compute sample innovation variance
        const innovationVariance = this.computeSampleVariance();

        // Expected variance is trace(S) / dim (simplified)
        const expectedVariance = this.computeExpectedVariance(expectedS);

        // Ratio: > 1 means innovations are larger than expected
        const ratio = innovationVariance / (expectedVariance + 1e-6);

        // Update multiplier with exponential smoothing
        const targetMultiplier = Math.max(
            this.config.minMultiplier,
            Math.min(this.config.maxMultiplier, ratio)
        );

        this.currentMultiplier =
            (1 - this.config.adaptationRate) * this.currentMultiplier +
            this.config.adaptationRate * targetMultiplier;

        return {
            multiplier: this.currentMultiplier,
            innovationVariance,
            expectedVariance
        };
    }

    /**
     * Get current adapted R matrix
     */
    getAdaptedR(): number[][] | null {
        if (!this.baseR) return null;
        return this.baseR.map(row => row.map(val => val * this.currentMultiplier));
    }

    /**
     * Compute sample variance of recent innovations
     */
    private computeSampleVariance(): number {
        if (this.innovationHistory.length < 2) return 0;

        let sumSq = 0;
        let count = 0;

        for (const inn of this.innovationHistory) {
            for (const val of inn) {
                sumSq += val * val;
                count++;
            }
        }

        return sumSq / count;
    }

    /**
     * Compute expected variance from innovation covariance
     */
    private computeExpectedVariance(S: number[][]): number {
        if (!S || S.length === 0) return 1;

        // Trace(S) / dim
        let trace = 0;
        for (let i = 0; i < S.length; i++) {
            trace += S[i]?.[i] ?? 0;
        }
        return trace / S.length;
    }

    /**
     * Enable/disable adaptation
     */
    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
    }

    /**
     * Get current multiplier for UI display
     */
    getMultiplier(): number {
        return this.currentMultiplier;
    }

    /**
     * Reset to defaults
     */
    reset(): void {
        this.innovationHistory = [];
        this.currentMultiplier = 1.0;
    }
}

// Singleton instance
export const adaptiveRTuner = new AdaptiveRTuner();
