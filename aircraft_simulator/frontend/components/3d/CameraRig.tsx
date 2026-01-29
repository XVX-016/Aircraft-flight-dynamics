"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Quaternion } from "three";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { useRef } from "react";

const CAMERA_STATES = {
    takeoff: { pos: [0, 4, 18], target: [0, 1, 0] },
    hangar: { pos: [8, 4, 12], target: [0, 1, 0] },
    specs: { pos: [0, 2, 8], target: [0, 0, 0] },
};

export default function CameraRig() {
    const sceneState = useSimulationStore((state) => state.sceneState);
    const { camera } = useThree();

    // Smooth targets
    const targetPos = useRef(new Vector3());
    const targetLookAt = useRef(new Vector3());

    useFrame((state, delta) => {
        const config = CAMERA_STATES[sceneState] || CAMERA_STATES.takeoff;

        // Lerp position
        targetPos.current.set(...(config.pos as [number, number, number]));
        camera.position.lerp(targetPos.current, 0.05);

        // Lerp lookAt target
        targetLookAt.current.set(...(config.target as [number, number, number]));

        // Custom lookAt interpolation
        // Standard lookAt(target) is instantaneous, so we use a proxy target
        state.camera.lookAt(targetLookAt.current);

        // Optional: add subtle breathing motion
        camera.position.y += Math.sin(state.clock.elapsedTime * 0.5) * 0.002;
    });

    return null;
}
