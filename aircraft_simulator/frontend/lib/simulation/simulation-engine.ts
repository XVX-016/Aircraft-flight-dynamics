import { AircraftConfig } from "./types/aircraft";
import { TruthState, EKFState, Vector3, Quaternion } from "./types/state";
import { ControlInput } from "./types/control";
import { RigidBody } from "./physics/dynamics";
import { Vec3, Quat } from "./physics/math-utils";
import defaultAircraft from "./data/default_aircraft.json";

// Types
type AircraftConfigType = AircraftConfig;

// Constants
const PHYSICS_DT = 0.01; // 100 Hz
const SNAPSHOT_BUFFER_SIZE = 4; // Minimal buffer for interpolation

export class SimulationEngine {
    private rigidBody: RigidBody;
    private config: AircraftConfigType;

    // Simulation State
    private currentState: TruthState;
    private currentTime: number = 0;

    // Inputs
    private currentControls: ControlInput = {
        throttle: 0,
        elevator: 0,
        aileron: 0,
        rudder: 0
    };

    // State Buffer for Interpolation
    private stateBuffer: Array<{ time: number; state: TruthState }> = [];

    constructor(config?: AircraftConfigType) {
        this.config = config || (defaultAircraft as unknown as AircraftConfigType);
        this.rigidBody = new RigidBody(this.config);
        this.currentState = this.getInitialState();
        this.pushStateToBuffer(0, this.currentState);
    }

    public getInitialState(): TruthState {
        // Initial trim condition approx
        return {
            p: { x: 0, y: 0, z: -1000 }, // 1000m altitude
            v: { x: 100, y: 0, z: 0 },   // 100 m/s
            q: { x: 0, y: 0, z: 0, w: 1 },
            w: { x: 0, y: 0, z: 0 },
            b_g: { x: 0, y: 0, z: 0 },
            b_a: { x: 0, y: 0, z: 0 },
            forces: { x: 0, y: 0, z: 0 },
            moments: { x: 0, y: 0, z: 0 },
            alpha: 0,
            beta: 0
        };
    }

    private pushStateToBuffer(time: number, state: TruthState) {
        this.stateBuffer.push({ time, state: { ...state } }); // Deep copyish
        if (this.stateBuffer.length > SNAPSHOT_BUFFER_SIZE) {
            this.stateBuffer.shift();
        }
    }

    public setControls(controls: Partial<ControlInput>) {
        this.currentControls = { ...this.currentControls, ...controls };
    }

    public getControls(): ControlInput {
        return { ...this.currentControls };
    }

    public update(dt: number) {
        // Accumulator logic usually handled outside or here. 
        // For simplicity allow fixed stepping called from outside loop or internal management.
        // Implemented as single step for now, caller handles accumulation.

        const nextState = this.rigidBody.step(this.currentState, this.currentControls, PHYSICS_DT);
        this.currentTime += PHYSICS_DT;
        this.currentState = nextState;

        this.pushStateToBuffer(this.currentTime, nextState);
    }

    /**
     * Get interpolated state for rendering time
     * @param renderTime System time to render at (controlled by main loop)
     */
    public getRenderState(renderTime: number): TruthState {
        // Find surrounding snapshots
        // Assuming renderTime is lagging slightly behind real time for interpolation
        // Strategy: Render at currentTime - interpolationDelay
        // Simple strategy: Just lerp between last two frames if we don't have strict synch

        if (this.stateBuffer.length < 2) return this.currentState;

        const entryA = this.stateBuffer[this.stateBuffer.length - 2];
        const entryB = this.stateBuffer[this.stateBuffer.length - 1];

        // Alpha calculation could be more complex with proper time sync
        // For now, return latest for responsiveness or simple lerp
        // Let's implement simple Lerp between last 2 physics steps 
        // This assumes `update` is called consistently
        return entryB.state; // Temporary: Return latest to verify physics moves first
    }

    // Explicit Interpolation helper
    public interpolate(alpha: number): TruthState {
        if (this.stateBuffer.length < 2) return this.currentState;

        const prev = this.stateBuffer[this.stateBuffer.length - 2].state;
        const curr = this.stateBuffer[this.stateBuffer.length - 1].state;

        // Lerp Position
        const p: Vector3 = {
            x: prev.p.x + (curr.p.x - prev.p.x) * alpha,
            y: prev.p.y + (curr.p.y - prev.p.y) * alpha,
            z: prev.p.z + (curr.p.z - prev.p.z) * alpha
        };

        // Slerp Quaternion (Linear approximation for small steps is mostly fine, but let's do Slerp if we can, or just normalize lerp)
        const q: Quaternion = {
            x: prev.q.x + (curr.q.x - prev.q.x) * alpha,
            y: prev.q.y + (curr.q.y - prev.q.y) * alpha,
            z: prev.q.z + (curr.q.z - prev.q.z) * alpha,
            w: prev.q.w + (curr.q.w - prev.q.w) * alpha
        };
        // Re-normalize
        const qMag = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
        q.x /= qMag; q.y /= qMag; q.z /= qMag; q.w /= qMag;

        return {
            ...curr,
            p,
            q
        };
    }
}

// Singleton Instance
export const simulationEngine = new SimulationEngine();
