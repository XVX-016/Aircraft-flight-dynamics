import { Aerodynamics, ControlInputs } from "../aerodynamics/aerodynamics";
import { RigidBody } from "../dynamics/rigid-body";
import { AircraftConfig } from "../aircraft/aircraft";
import { CESSNA_172R } from "../aircraft/database/cessna172";

export class Linearization {
    private aero: Aerodynamics;
    private rigidBody: RigidBody;

    constructor(private config: AircraftConfig = CESSNA_172R) {
        this.aero = new Aerodynamics(config);
        this.rigidBody = new RigidBody(config);
    }

    public computeJacobian(trimState: number[], trimControls: ControlInputs): number[][] {
        const n = 12; // State size
        const A: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
        const epsilon = 1e-4;

        const f0 = this.getDerivatives(trimState, trimControls);

        for (let i = 0; i < n; i++) {
            const perturbedState = [...trimState];
            perturbedState[i] += epsilon;

            const f = this.getDerivatives(perturbedState, trimControls);

            for (let j = 0; j < n; j++) {
                A[j][i] = (f[j] - f0[j]) / epsilon;
            }
        }

        return A;
    }

    public computeStateInputJacobians(
        trimState: number[],
        trimControls: ControlInputs
    ): { A: number[][]; B: number[][] } {
        const n = 12;
        const m = 4; // throttle, aileron, elevator, rudder
        const A: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
        const B: number[][] = Array(n).fill(0).map(() => Array(m).fill(0));
        const epsX = 1e-4;
        const epsU = 1e-4;

        const f0 = this.getDerivatives(trimState, trimControls);

        for (let i = 0; i < n; i++) {
            const xPert = [...trimState];
            xPert[i] += epsX;
            const f = this.getDerivatives(xPert, trimControls);
            for (let j = 0; j < n; j++) {
                A[j][i] = (f[j] - f0[j]) / epsX;
            }
        }

        const u0 = [
            trimControls.throttle,
            trimControls.aileron,
            trimControls.elevator,
            trimControls.rudder
        ];
        for (let i = 0; i < m; i++) {
            const up = [...u0];
            up[i] += epsU;
            const f = this.getDerivatives(trimState, {
                throttle: up[0],
                aileron: up[1],
                elevator: up[2],
                rudder: up[3]
            });
            for (let j = 0; j < n; j++) {
                B[j][i] = (f[j] - f0[j]) / epsU;
            }
        }

        return { A, B };
    }

    private getDerivatives(state: number[], controls: ControlInputs): number[] {
        const { F, M } = this.aero.calculateForcesAndMoments(state, controls);
        return this.rigidBody.equationsOfMotion(0, state, {
            Fx: F[0], Fy: F[1], Fz: F[2],
            Mx: M[0], My: M[1], Mz: M[2]
        });
    }

    // Note: Eigenvalue computation requires a linear algebra library.
    // For now, we return A matrix. Frontend can compute eigenvalues using mathjs or numeric.js.
}
