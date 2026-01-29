"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { simulationEngine } from "@/lib/simulation/simulation-engine";
import { useSimulationStore } from "@/stores/useSimulationStore";

const PHYSICS_DT = 0.01; // 100 Hz

export default function SimulationManager() {
    const isPaused = useSimulationStore((state) => state.isPaused);
    const accumulator = useRef(0);

    useFrame((state, delta) => {
        if (isPaused) return;

        // Clamp delta to prevent spiral of death and huge jumps
        const dt = Math.min(delta, 0.1);

        accumulator.current += dt;

        while (accumulator.current >= PHYSICS_DT) {
            simulationEngine.update(PHYSICS_DT);
            accumulator.current -= PHYSICS_DT;
        }

        // Update UI Telemetry (Run every frame)
        const truth = simulationEngine.getRenderState(state.clock.elapsedTime);
        const q = truth.q;
        // Convert NED Quaternion to Euler (Roll, Pitch, Yaw)
        // Note: Physics internal state is NED. 
        // We use Three.js helper, but interpret result carefully. Order ZYX (Yaw, Pitch, Roll) is standard.
        const quat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
        const euler = new THREE.Euler().setFromQuaternion(quat, 'ZYX');

        useSimulationStore.getState().updateTelemetry({
            position: [truth.p.x, truth.p.y, truth.p.z],
            velocity: Math.sqrt(truth.v.x ** 2 + truth.v.y ** 2 + truth.v.z ** 2), // True Airspeed
            altitude: -truth.p.z, // NED Z is Down
            orientation: [euler.x, euler.y, euler.z] // [Roll, Pitch, Yaw]
        });
    });

    return null;
}
