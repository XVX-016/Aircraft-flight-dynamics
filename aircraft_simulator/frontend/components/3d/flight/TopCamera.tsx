"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import type { FlightState } from "@/hooks/useFlightSim";

interface TopCameraProps {
    state: FlightState | null;
}

/**
 * Top-down orthographic camera. Looks straight down (-Y in Three.js = +Z NED = down).
 * Tracks the aircraft's ground position (X, Z). Makes crosswind drift visible.
 */
export default function TopCamera({ state }: TopCameraProps) {
    const camRef = useRef<THREE.OrthographicCamera>(null);

    useFrame(() => {
        if (!camRef.current || !state) return;

        // Ground track: (x, -y) in Three.js coords matching NED (N, E)
        const acX = state.x;
        const acZ = -state.y;
        
        // Ensure camera is always above the aircraft (altitude_m + buffer)
        // or just a high fixed ceiling. using 2000m.
        const viewHeight = Math.max(2000, state.altitude_m + 500);

        // Snap track: Orthographic views should feel like a fixed map projection
        camRef.current.position.set(acX, viewHeight, acZ);
        camRef.current.lookAt(acX, 0, acZ);

        // Dynamic zoom: scale frustum size with altitude to keep context
        const frustumSize = Math.max(200, state.altitude_m * 0.5);
        camRef.current.left = -frustumSize;
        camRef.current.right = frustumSize;
        camRef.current.top = frustumSize;
        camRef.current.bottom = -frustumSize;
        camRef.current.updateProjectionMatrix();
    });

    return (
        <OrthographicCamera
            ref={camRef}
            makeDefault
            near={0.1}
            far={50000}
            position={[0, 2000, 0]}
        />
    );
}
