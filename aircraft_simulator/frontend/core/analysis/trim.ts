import { SimulationEngine } from "../engine";
import { Aerodynamics, ControlInputs } from "../aerodynamics/aerodynamics";
import { RigidBody } from "../dynamics/rigid-body";
import { AircraftConfig } from "../aircraft/aircraft";
import { CESSNA_172R } from "../aircraft/database/cessna172";

export interface TrimResult {
    alpha: number;
    elevator: number;
    throttle: number;
    converged: boolean;
    iterations: number;
    residuals: { Fx: number, Fz: number, My: number };
}

export class TrimSolver {
    private aero: Aerodynamics;
    private rigidBody: RigidBody;

    constructor(private config: AircraftConfig = CESSNA_172R) {
        this.aero = new Aerodynamics(config);
        this.rigidBody = new RigidBody(config);
    }

    public solve(velocity: number = 60, height: number = 1000): TrimResult {
        // Unknowns: [alpha, elevator, throttle]
        let x = [0.05, 0, 0.5]; // Initial guess: 3 deg alpha, 0 elevator, 50% throttle

        const maxIter = 50;
        const tol = 1e-4;
        const perturbation = 1e-5;

        for (let iter = 0; iter < maxIter; iter++) {
            const [alpha, de, th] = x;
            const residuals = this.evaluateResiduals(velocity, height, alpha, de, th);
            const R = [residuals.Fx, residuals.Fz, residuals.My];

            if (Math.abs(R[0]) < tol && Math.abs(R[1]) < tol && Math.abs(R[2]) < tol) {
                return {
                    alpha,
                    elevator: de,
                    throttle: th,
                    converged: true,
                    iterations: iter,
                    residuals
                };
            }

            // Jacobian J = dR/dx
            const J: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

            // Perturb alpha
            const r_da = this.evaluateResiduals(velocity, height, alpha + perturbation, de, th);
            J[0][0] = (r_da.Fx - R[0]) / perturbation;
            J[1][0] = (r_da.Fz - R[1]) / perturbation;
            J[2][0] = (r_da.My - R[2]) / perturbation;

            // Perturb elevator
            const r_dde = this.evaluateResiduals(velocity, height, alpha, de + perturbation, th);
            J[0][1] = (r_dde.Fx - R[0]) / perturbation;
            J[1][1] = (r_dde.Fz - R[1]) / perturbation;
            J[2][1] = (r_dde.My - R[2]) / perturbation;

            // Perturb throttle
            const r_dth = this.evaluateResiduals(velocity, height, alpha, de, th + perturbation);
            J[0][2] = (r_dth.Fx - R[0]) / perturbation;
            J[1][2] = (r_dth.Fz - R[1]) / perturbation;
            J[2][2] = (r_dth.My - R[2]) / perturbation;

            // Solve J * delta = -R
            // Use simple Gaussian elimination or inversion for 3x3
            const delta = this.solveLinear3x3(J, R.map(v => -v));

            // Update x
            x[0] += delta[0];
            x[1] += delta[1];
            x[2] += delta[2];

            // Clamp throttle 0-1
            x[2] = Math.max(0, Math.min(1, x[2]));
        }

        return {
            alpha: x[0],
            elevator: x[1],
            throttle: x[2],
            converged: false,
            iterations: maxIter,
            residuals: this.evaluateResiduals(velocity, height, x[0], x[1], x[2])
        };
    }

    private evaluateResiduals(V: number, h: number, alpha: number, de: number, th: number) {
        // Construct state for level flight
        // u = V cos(alpha)
        // w = V sin(alpha)
        // theta = alpha (gamma = 0)
        // q = 0, p = 0, r = 0, phi = 0
        const u = V * Math.cos(alpha);
        const w = V * Math.sin(alpha);
        const theta = alpha;

        const state = [
            u, 0, w,    // u, v, w
            0, 0, 0,    // p, q, r
            0, theta, 0,// phi, theta, psi
            0, 0, -h    // x, y, z
        ];

        const controls: ControlInputs = {
            throttle: th,
            elevator: de,
            aileron: 0,
            rudder: 0
        };

        const { F, M } = this.aero.calculateForcesAndMoments(state, controls);

        // Calculate derivatives
        const derivs = this.rigidBody.equationsOfMotion(0, state, {
            Fx: F[0], Fy: F[1], Fz: F[2],
            Mx: M[0], My: M[1], Mz: M[2]
        });

        // Residuals are the rates we want to be zero: u_dot, w_dot, q_dot
        // derivs indices: u_dot(0), v_dot(1), w_dot(2), p_dot(3), q_dot(4), r_dot(5)
        return {
            Fx: derivs[0], // u_dot
            Fz: derivs[2], // w_dot
            My: derivs[4]  // q_dot
        };
    }

    private solveLinear3x3(A: number[][], b: number[]): number[] {
        // Cramer's rule or basic elimination
        // Determinant of A
        const det = A[0][0] * (A[1][1] * A[2][2] - A[2][1] * A[1][2]) -
            A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
            A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

        if (Math.abs(det) < 1e-9) return [0, 0, 0]; // Singular

        const invDet = 1 / det;

        const x = (b[0] * (A[1][1] * A[2][2] - A[2][1] * A[1][2]) -
            A[0][1] * (b[1] * A[2][2] - A[1][2] * b[2]) +
            A[0][2] * (b[1] * A[2][1] - A[1][1] * b[2])) * invDet;

        const y = (A[0][0] * (b[1] * A[2][2] - A[1][2] * b[2]) -
            b[0] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
            A[0][2] * (A[1][0] * b[2] - b[1] * A[2][0])) * invDet;

        const z = (A[0][0] * (A[1][1] * b[2] - b[1] * A[2][1]) -
            A[0][1] * (A[1][0] * b[2] - b[1] * A[2][0]) +
            b[0] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])) * invDet;

        return [x, y, z];
    }
}
