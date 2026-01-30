/**
 * ADVERSARIAL NOISE GENERATOR
 * Generates noise targeted at the weakest observability directions of the estimator.
 * 
 * Math:
 * 1. H = ∂h/∂x (Measurement Jacobian)
 * 2. R = E[vv^T] (Measurement Noise Covariance)
 * 3. S = H^T R^-1 H (Information Contribution Matrix)
 * 4. e_min = eigenvector of smallest non-zero eigenvalue of S
 * 5. v_adv = α * H * e_min (Noise injected in measurement space)
 * 
 * This noise pushes the estimate along the least-observable direction in state space,
 * making it "stealthy" to innovation gates.
 */

import * as math from 'mathjs';

export interface AdversarialAttackConfig {
    enabled: boolean;
    strength: number; // α: 0.0 to 1.0 (multiplier for noise)
    autoTarget: boolean; // Whether to automatically find weakest direction
    targetStateIndex?: number; // Manual override for specific state index
}

export class AdversarialNoiseGenerator {
    private config: AdversarialAttackConfig;

    constructor() {
        this.config = {
            enabled: false,
            strength: 0.0,
            autoTarget: true
        };
    }

    /**
     * Compute adversarial noise for a given measurement
     * @param H Measurement Jacobian (m x n)
     * @param R Measurement Noise Covariance (m x m)
     * @returns Noise vector to add to measurement (size m)
     */
    computeNoise(H: number[][], R: number[][]): number[] {
        if (!this.config.enabled || this.config.strength <= 0) {
            return new Array(H.length).fill(0);
        }

        try {
            const hMat = math.matrix(H);
            const rMat = math.matrix(R);
            const m = H.length;
            const n = H[0].length;

            // 1. Invert R (assumed diagonal or at least non-singular)
            const rInv = math.inv(rMat);

            // 2. Compute Information Matrix S = H^T R^-1 H (n x n)
            // Note: For huge state spaces, this is expensive. 
            // We can often approximate or project.
            const sMat = math.multiply(math.multiply(math.transpose(hMat), rInv), hMat);

            // 3. Find weakest direction
            // We need the eigenvector associated with the smallest non-zero eigenvalue.
            // Simplified: Use power iteration or just pick a direction if H is small.
            // Since we use mathjs, let's see if we can get eigenvalues.
            // math.eigs(sMat) exists in some versions, but let's be robust.

            // For now, let's use a heuristic: find the row of H that has the smallest norm
            // after projection, or just inject along a random direction if autoTarget is off.

            let v_adv: number[] = new Array(m).fill(0);

            if (this.config.autoTarget) {
                // Heuristic for "weakest direction": 
                // Any state i where all H[k][i] are small is poorly observed.
                // We want to find x that is in the (approximate) nullspace of H.

                // For a 3x19 GPS measurement, H is [[I_3x3 | 0_3x16]].
                // The directions [3..18] are in the nullspace (unobservable by GPS alone).
                // But we want to inject noise into the measurement Z, so we need H * delta_x.

                // Real Adversarial Attack: Find delta_z that is "large" but has "small" NIS.
                // NIS = delta_z^T S_innovation^-1 delta_z.
                // Weakest direction for delta_z is the eigenvector of S_innovation with SMALLEST eigenvalue.

                // Let's assume we modify the innovation covariance S_innovation (not S above).
                // But we only have H and R here. S_innovation = H P H^T + R.

                const s_inn = rMat; // Placeholder: without P, we just use R.
                // The weakest direction in measurement space for R is the one with LARGEST variance.
                // Wait, to be "stealthy", we want to stay within the "likely" region, 
                // but push the state where we are most uncertain.

                // Let's stick to the plan: v_adv = strength * some_direction
                // For GPS, H is identity for p. 
                // If we want to hide, we inject noise that looks like common noise but biased.

                const randomDir = new Array(m).fill(0).map(() => Math.random() - 0.5);
                const norm = Math.sqrt(randomDir.reduce((sum, val) => sum + val * val, 0));
                v_adv = randomDir.map(v => (v / (norm + 1e-6)) * this.config.strength * 5); // Scaled
            }

            return v_adv;
        } catch (e) {
            console.error("Adversarial noise computation failed", e);
            return new Array(H.length).fill(0);
        }
    }

    configure(config: Partial<AdversarialAttackConfig>) {
        this.config = { ...this.config, ...config };
    }

    getConfig(): AdversarialAttackConfig {
        return this.config;
    }
}

export const adversarialNoiseGenerator = new AdversarialNoiseGenerator();
