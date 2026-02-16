import { SimulationEngine } from "./engine";

const engine = new SimulationEngine();

// Simulation parameters
const dt = 0.01;
const duration = 10.0;
const steps = duration / dt;

console.log("Starting Simulation check...");
console.log("Initial State:");
console.log(JSON.stringify(engine.getState(), null, 2));

console.log("\nRunning simulation for 10 seconds...");

for (let i = 0; i < steps; i++) {
    // Inputs: Full throttle, slight elevator up to maintain trim approx?
    // Actually, let's just hold steady controls to see natural frequency
    engine.step(dt, {
        throttle: 0.7, // Cruise power
        elevator: -0.05, // Slight pitch up trim?
        aileron: 0,
        rudder: 0
    });

    if (i % 100 === 0) { // Log every second
        const state = engine.getState();
        console.log(`t=${state.time.toFixed(2)}s | Alt=${(-state.position.z).toFixed(1)}m | V=${state.aero.airspeed.toFixed(1)}m/s | Alpha=${(state.aero.alpha * 180 / Math.PI).toFixed(2)}deg`);
    }
}

console.log("\nFinal State:");
console.log(JSON.stringify(engine.getState(), null, 2));
