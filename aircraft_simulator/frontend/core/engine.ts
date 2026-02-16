import { AircraftConfig } from "./aircraft/aircraft";
import { Aerodynamics, ControlInputs } from "./aerodynamics/aerodynamics";
import { RigidBody } from "./dynamics/rigid-body";
import { Integrator } from "./dynamics/integrator";
import { CESSNA_172R } from "./aircraft/database/cessna172";
import { Autopilot } from "./control/autopilot";
import { EKF } from "./estimation/ekf";
import { Sensors } from "./estimation/sensors";

export class SimulationEngine {
    private rigidBody: RigidBody;
    private aerodynamics: Aerodynamics;
    private autopilot: Autopilot;
    private ekf: EKF;
    private sensors: Sensors;

    private state: number[]; // [u, v, w, p, q, r, phi, theta, psi, x, y, z]
    private time: number = 0;

    constructor(config: AircraftConfig = CESSNA_172R) {
        this.rigidBody = new RigidBody(config);
        this.aerodynamics = new Aerodynamics(config);
        this.autopilot = new Autopilot(); // Initialize Autopilot
        this.ekf = new EKF(config);       // Initialize EKF
        this.sensors = new Sensors();     // Initialize Sensors

        // Initial conditions: Level flight approx
        // u=60, w=0, theta=0, h=1000
        this.state = [
            60, 0, 0,   // u, v, w
            0, 0, 0,    // p, q, r
            0, 0, 0,    // phi, theta, psi
            0, 0, -1000 // x, y, z (NED, so -1000 is 1000m up)
        ];

        // Initialize EKF with perfect knowledge initially
        this.ekf.init(this.state);
    }

    public step(dt: number, manualControls: ControlInputs): void {
        // 1. Autopilot Control Law
        // Autopilot overrides manual controls if active
        // But usually it mixes or takes over specific channels.
        // For now, let's say Autopilot Output + Manual Input? 
        // Or Autopilot replaces Manual if mode != OFF.

        let activeControls = manualControls;
        const apControls = this.autopilot.update(dt, this.ekf.getEstimate().state); // Use Estimate for Feedback!

        if (this.autopilot.mode !== 0) { // 0 is OFF
            activeControls = apControls;
        }

        // 2. Physics Step (Truth)
        const derivativeFn = (t: number, currentState: number[]) => {
            const { F, M } = this.aerodynamics.calculateForcesAndMoments(currentState, activeControls);
            return this.rigidBody.equationsOfMotion(t, currentState, { Fx: F[0], Fy: F[1], Fz: F[2], Mx: M[0], My: M[1], Mz: M[2] });
        };

        this.state = Integrator.rk4(this.time, this.state, dt, derivativeFn);
        this.time += dt;

        // 3. Sensor Measurement (Truth -> Measured)
        const measurement = this.sensors.measure(this.state);

        // 4. EKF Prediction & Update
        this.ekf.predict(activeControls, dt);
        this.ekf.update(measurement);

        // Update Aero State for getters (optional, internal to aero class usually but good to expose)
        // this.aerodynamics.updateAeroState(this.state); 
    }

    public getState() {
        // Return both Truth and Estimate for visualization/comparison
        const { F, M, aeroState } = this.aerodynamics.calculateForcesAndMoments(this.state, { throttle: 0, elevator: 0, aileron: 0, rudder: 0 });

        // Map [u,v,w] to Inertial Velocity for simplified frontend consumption? 
        // Frontend expects body velocity 'v'. ok.

        return {
            time: this.time,
            // Truth
            position: { x: this.state[9], y: this.state[10], z: this.state[11] },
            velocity: { u: this.state[0], v: this.state[1], w: this.state[2] },
            rates: { p: this.state[3], q: this.state[4], r: this.state[5] },
            attitude: { phi: this.state[6], theta: this.state[7], psi: this.state[8] },
            aero: aeroState,

            // Estimate
            estimate: this.ekf.getEstimate()
        };
    }

    public getAutopilot() {
        return this.autopilot;
    }

    public getRawState(): number[] {
        return [...this.state];
    }

    /**
     * Pure prediction for external analysis (Validation System)
     * Does not mutate internal state.
     */
    public predict(state: number[], controls: ControlInputs, dt: number): number[] {
        const derivativeFn = (t: number, currentState: number[]) => {
            const { F, M } = this.aerodynamics.calculateForcesAndMoments(currentState, controls);
            return this.rigidBody.equationsOfMotion(t, currentState, { Fx: F[0], Fy: F[1], Fz: F[2], Mx: M[0], My: M[1], Mz: M[2] });
        };
        return Integrator.rk4(0, state, dt, derivativeFn);
    }
}

