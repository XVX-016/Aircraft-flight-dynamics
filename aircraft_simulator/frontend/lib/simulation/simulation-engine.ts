import { AircraftConfig as UiAircraftConfig } from "./types/aircraft";
import { TruthState } from "./types/state";
import { Quat } from "./utils";
import { ControlInput } from "./types/control";
import { SimulationEngine as CoreEngine } from "@/core/engine";
import { TrimSolver, TrimResult } from "@/core/analysis/trim";
import { Linearization } from "@/core/analysis/linearization";
import { CESSNA_172R } from "@/core/aircraft/database/cessna172";
import { AircraftConfig as CoreAircraftConfig } from "@/core/aircraft/aircraft";
import { AutopilotMode } from "@/core/control/autopilot";

const SNAPSHOT_BUFFER_SIZE = 4;

function mapUiToCoreConfig(ui: UiAircraftConfig): CoreAircraftConfig {
    return {
        name: ui.name,
        mass: {
            mass: ui.massProps.mass,
            ixx: ui.massProps.Ixx,
            iyy: ui.massProps.Iyy,
            izz: ui.massProps.Izz,
            ixz: ui.massProps.Ixz
        },
        geometry: {
            wingArea: ui.geometry.wingArea,
            wingSpan: ui.geometry.wingSpan,
            meanChord: ui.geometry.chord
        },
        aero: {
            cL0: ui.aero.CL0,
            cLa: ui.aero.CL_alpha,
            cLq: ui.aero.CL_q,
            cLde: ui.aero.CL_de,
            cD0: ui.aero.CD0,
            k: 0.053, // Keep drag polar induced factor aligned with current core model
            cm0: ui.aero.Cm0,
            cma: ui.aero.Cm_alpha,
            cmq: ui.aero.Cm_q,
            cmde: ui.aero.Cm_de,
            cyb: ui.aero.CY_beta,
            clb: ui.aero.Cl_beta,
            cnb: ui.aero.Cn_beta,
            clp: ui.aero.Cl_p,
            cnr: ui.aero.Cn_r,
            clda: ui.aero.Cl_da,
            cndr: ui.aero.Cn_dr
        },
        propulsion: {
            maxThrust: ui.propulsion[0]?.maxThrust ?? 2500
        }
    };
}

export class SimulationEngine {
    private engine: CoreEngine;
    private stateBuffer: Array<{ time: number; state: TruthState }> = [];
    private trimSolver: TrimSolver;
    private linearization: Linearization;
    private coreConfig: CoreAircraftConfig = CESSNA_172R;

    private currentControls: ControlInput = {
        throttle: 0.5,
        elevator: 0,
        aileron: 0,
        rudder: 0
    };

    constructor() {
        this.engine = new CoreEngine(this.coreConfig);
        this.trimSolver = new TrimSolver(this.coreConfig);
        this.linearization = new Linearization(this.coreConfig);
        const initialState = this.mapCoreStateToTruthState(this.engine.getState());
        this.pushStateToBuffer(0, initialState);
    }

    public reset(): void {
        this.engine = new CoreEngine(this.coreConfig);
        this.trimSolver = new TrimSolver(this.coreConfig);
        this.linearization = new Linearization(this.coreConfig);
        this.stateBuffer = [];
        const initialState = this.mapCoreStateToTruthState(this.engine.getState());
        this.pushStateToBuffer(0, initialState);
    }

    public setAircraftConfig(config: UiAircraftConfig): void {
        this.coreConfig = mapUiToCoreConfig(config);
        this.reset();
    }

    public update(dt: number): void {
        this.engine.step(dt, this.currentControls);
        const coreState = this.engine.getState();
        const truthState = this.mapCoreStateToTruthState(coreState);
        this.pushStateToBuffer(coreState.time, truthState);
    }

    public setControls(controls: Partial<ControlInput>): void {
        this.currentControls = { ...this.currentControls, ...controls };
    }

    public getControls(): ControlInput {
        return { ...this.currentControls };
    }

    public getCoreState(): {
        time: number;
        position: { x: number; y: number; z: number };
        velocity: { u: number; v: number; w: number };
        rates: { p: number; q: number; r: number };
        attitude: { phi: number; theta: number; psi: number };
        aero?: { alpha?: number; beta?: number };
        estimate?: { state: number[]; covariance: number[][] };
    } {
        return this.engine.getState();
    }

    public setAutopilotMode(mode: AutopilotMode): void {
        this.engine.getAutopilot().mode = mode;
    }

    public setAutopilotTargets(targets: { altitude?: number; heading?: number; speed?: number }): void {
        const ap = this.engine.getAutopilot();
        if (targets.altitude !== undefined) ap.targetAltitude = targets.altitude;
        if (targets.heading !== undefined) ap.targetHeading = targets.heading;
        if (targets.speed !== undefined) ap.targetSpeed = targets.speed;
    }

    public getAutopilotState(): { mode: AutopilotMode } {
        return this.engine.getAutopilot() as unknown as { mode: AutopilotMode };
    }

    public getRenderState(_renderTime: number): TruthState {
        void _renderTime;
        if (this.stateBuffer.length === 0) return this.mapCoreStateToTruthState(this.engine.getState());
        return this.stateBuffer[this.stateBuffer.length - 1].state;
    }

    public async calculateTrim(): Promise<TrimResult> {
        return this.trimSolver.solve(60, 1000);
    }

    public async computeLinearization(): Promise<{ A: number[][]; B: number[][]; trim: TrimResult }> {
        const trim = this.trimSolver.solve(60, 1000);
        const alpha = trim.alpha;
        const V = 60;
        const u = V * Math.cos(alpha);
        const w = V * Math.sin(alpha);
        const theta = alpha;
        const state = [u, 0, w, 0, 0, 0, 0, theta, 0, 0, 0, -1000];
        const controls = { throttle: trim.throttle, elevator: trim.elevator, aileron: 0, rudder: 0 };
        const { A, B } = this.linearization.computeStateInputJacobians(state, controls);
        return { A, B, trim };
    }

    private mapCoreStateToTruthState(coreState: ReturnType<SimulationEngine["getCoreState"]>): TruthState {
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

    private pushStateToBuffer(time: number, state: TruthState): void {
        this.stateBuffer.push({ time, state });
        if (this.stateBuffer.length > SNAPSHOT_BUFFER_SIZE) this.stateBuffer.shift();
    }

    public predictDeterminstic(state: TruthState, dt: number): TruthState {
        const euler = Quat.toEuler(state.q);
        const s = [
            state.v.x, state.v.y, state.v.z,
            state.w.x, state.w.y, state.w.z,
            euler.x, euler.y, euler.z,
            state.p.x, state.p.y, state.p.z
        ];
        const nextStateVec = this.engine.predict(s, this.currentControls, dt);
        return {
            ...state,
            p: { x: nextStateVec[9], y: nextStateVec[10], z: nextStateVec[11] },
            v: { x: nextStateVec[0], y: nextStateVec[1], z: nextStateVec[2] },
            w: { x: nextStateVec[3], y: nextStateVec[4], z: nextStateVec[5] },
            q: Quat.fromEuler(nextStateVec[6], nextStateVec[7], nextStateVec[8])
        };
    }

    public getInitialState(): TruthState {
        return this.mapCoreStateToTruthState(this.engine.getState());
    }
}

export const simulationEngine = new SimulationEngine();
