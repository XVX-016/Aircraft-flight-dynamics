"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { useRef } from "react";
import { CAMERA_PRESETS } from "@/lib/simulation/sceneConstants";

export default function CameraRig() {
    const sceneState = useSimulationStore((state) => state.sceneState);
    const { camera } = useThree();

    // Smooth target references
    const targetPos = useRef(new Vector3());
    const targetLookAt = useRef(new Vector3());
    const currentLookAt = useRef(new Vector3(0, 1, 0));

    useFrame((state, delta) => {
        const config = (CAMERA_PRESETS as any)[sceneState] || CAMERA_PRESETS.takeoff;

        // 1. Smooth Position Interpolation
        targetPos.current.set(...(config.pos as [number, number, number]));
        camera.position.lerp(targetPos.current, 0.05);

        // 2. Smooth LookAt Interpolation
        // Instead of instant lookAt, we lerp the point the camera is looking at
        targetLookAt.current.set(...(config.target as [number, number, number]));
        currentLookAt.current.lerp(targetLookAt.current, 0.05);
        camera.lookAt(currentLookAt.current);

        // 3. Subtle Breathing Motion for "Alive" feel
        camera.position.y += Math.sin(state.clock.elapsedTime * 0.4) * 0.0015;
    });

    return null;
}
