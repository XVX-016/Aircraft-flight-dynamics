import { AircraftConfig } from "./types/aircraft";
import { TruthState, Vector3, Quaternion } from "./types/state";
import { Quat } from "./utils";
import { ControlInput } from "./types/control";
import { SimulationEngine as CoreEngine } from "@/core/engine";
import { TrimSolver, TrimResult } from "@/core/analysis/trim";
import { Linearization } from "@/core/analysis/linearization";
import { CESSNA_172R } from "@/core/aircraft/database/cessna172";
import { AutopilotMode } from "@/core/control/autopilot";

// Constants
const PHYSICS_DT = 0.01; // 100 Hz
const SNAPSHOT_BUFFER_SIZE = 4;

export class SimulationEngine {
    private engine: CoreEngine;
    private stateBuffer: Array<{ time: number; state: TruthState }> = [];

    // Analysis tools
    private trimSolver: TrimSolver;
    private linearization: Linearization;

    constructor() {
        this.engine = new CoreEngine(CESSNA_172R);
        this.trimSolver = new TrimSolver(CESSNA_172R);
        this.linearization = new Linearization(CESSNA_172R);

        const initialState = this.mapCoreStateToTruthState(this.engine.getState());
        this.pushStateToBuffer(0, initialState);
    }

    public update(dt: number) {
        // The core engine step takes controls. We need to store current controls.
        // But CoreEngine.step(dt, controls) is stateless regarding input storage?
        // Let's assume we pass the last known controls.
        // We need to store controls here then.
        this.engine.step(dt, this.currentControls);

        const coreState = this.engine.getState();
        const truthState = this.mapCoreStateToTruthState(coreState);

        this.pushStateToBuffer(coreState.time, truthState);
    }

    private currentControls: ControlInput = {
        throttle: 0.5,
        elevator: 0,
        aileron: 0,
        rudder: 0
    };

    public setControls(controls: Partial<ControlInput>) {
        this.currentControls = { ...this.currentControls, ...controls };
    }

    public getControls(): ControlInput {
        return { ...this.currentControls };
    }

    public setAutopilotMode(mode: AutopilotMode) {
        this.engine.getAutopilot().mode = mode;
    }

    public setAutopilotTargets(targets: { altitude?: number, heading?: number, speed?: number }) {
        const ap = this.engine.getAutopilot();
        if (targets.altitude !== undefined) ap.targetAltitude = targets.altitude;
        if (targets.heading !== undefined) ap.targetHeading = targets.heading;
        if (targets.speed !== undefined) ap.targetSpeed = targets.speed;
    }

    public getAutopilotState() {
        return this.engine.getAutopilot();
    }

    public getRenderState(renderTime: number): TruthState {
        // Simple latest state for now
        if (this.stateBuffer.length === 0) return this.mapCoreStateToTruthState(this.engine.getState());
        return this.stateBuffer[this.stateBuffer.length - 1].state;
    }

    // --- Analysis Methods ---

    public async calculateTrim(): Promise<TrimResult> {
        return this.trimSolver.solve(60, 1000);
    }

    public async computeLinearization() {
        // Compute Jacobian around current state or trim state?
        // Usually trim.
        const trim = this.trimSolver.solve(60, 1000);

        // Convert trim result back to full state vector
        // This logic is duplicated in TrimSolver.evaluateResiduals...
        // We should probably expose "createStateFromTrim" in TrimSolver or similar.
        // For now, let's just use the current state if converged?
        // Actually, Linearization.computeJacobian takes state array.
        // We need to reconstruct it.

        const alpha = trim.alpha;
        const V = 60;
        const u = V * Math.cos(alpha);
        const w = V * Math.sin(alpha);
        const theta = alpha;

        const state = [
            u, 0, w,
            0, 0, 0,
            0, theta, 0,
            0, 0, -1000
        ];

        const controls = {
            throttle: trim.throttle,
            elevator: trim.elevator,
            aileron: 0,
            rudder: 0
        };

        const A = this.linearization.computeJacobian(state, controls);
        return { A, trim };
    }

    // --- Helpers ---

    private mapCoreStateToTruthState(coreState: any): TruthState {
        return {
            p: { x: coreState.position.x, y: coreState.position.y, z: coreState.position.z },
            v: { x: coreState.velocity.u, y: coreState.velocity.v, z: coreState.velocity.w },
            q: Quat.fromEuler(coreState.attitude.phi, coreState.attitude.theta, coreState.attitude.psi),
            w: { x: coreState.rates.p, y: coreState.rates.q, z: coreState.rates.r },
            b_g: { x: 0, y: 0, z: 0 },
            b_a: { x: 0, y: 0, z: 0 },
            forces: { x: 0, y: 0, z: 0 },
            moments: { x: 0, y: 0, z: 0 },
            alpha: coreState.aero?.alpha || 0,
            beta: coreState.aero?.beta || 0
        };
    }

    private pushStateToBuffer(time: number, state: TruthState) {
        this.stateBuffer.push({ time, state });
        if (this.stateBuffer.length > SNAPSHOT_BUFFER_SIZE) {
            this.stateBuffer.shift();
        }
    }

    // --- Validation Support ---

    /**
     * Pure deterministic prediction for Jacobian computation
     */
    public predictDeterminstic(state: TruthState, dt: number): TruthState {
        // 1. Reconstruct Core State Vector [u,v,w, p,q,r, phi,theta,psi, x,y,z] from TruthState
        const euler = Quat.toEuler(state.q);

        const s = [
            state.v.x, state.v.y, state.v.z,
            state.w.x, state.w.y, state.w.z,
            euler.x, euler.y, euler.z,
            state.p.x, state.p.y, state.p.z
        ];

        // 2. Predict using Core Engine
        const nextStateVec = this.engine.predict(s, this.currentControls, dt);

        // 3. Map back (simplified)
        return {
            ...state, // Persist other props
            p: { x: nextStateVec[9], y: nextStateVec[10], z: nextStateVec[11] },
            v: { x: nextStateVec[0], y: nextStateVec[1], z: nextStateVec[2] },
            w: { x: nextStateVec[3], y: nextStateVec[4], z: nextStateVec[5] },
            q: Quat.fromEuler(nextStateVec[6], nextStateVec[7], nextStateVec[8])
        };
    }
    public getInitialState(): TruthState {
        // Return initial state (t=0)
        return this.mapCoreStateToTruthState(this.engine.getState()); // Should use initial state config if available
    }
}

export const simulationEngine = new SimulationEngine();
