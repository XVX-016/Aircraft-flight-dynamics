"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import type { FlightState } from "@/hooks/useFlightSim";

interface SideCameraProps {
    state: FlightState | null;
}

/**
 * Side profile camera. Orthographic, looking from the East (-Z in Three.js).
 * Shows the altitude profile and pitch behaviour.
 */
export default function SideCamera({ state }: SideCameraProps) {
    const camRef = useRef<THREE.OrthographicCamera>(null);

    useFrame(() => {
        if (!camRef.current || !state) return;

        // NED -> Three.js Y-up transformation
        const acX = state.x;
        const acY = -state.z; // altitude
        const acZ = -state.y; 
        
        // Side view offset (looking from East)
        const offsetZ = -500;
        
        // Snap track X-axis, keep Y fixed (or centered) based on altitude
        // Looking at (acX, 0, acZ) which is ground level below aircraft
        camRef.current.position.set(acX, 500, offsetZ);
        camRef.current.lookAt(acX, 0, acZ);

        // Scale frustum size so ground and aircraft are both in frame
        // Math.max(500, alt * 2) ensures even at low altitude we have a 500m window
        const frustumHeight = Math.max(500, state.altitude_m * 2);
        const aspect = 16 / 9; // approximate aspect ratio or get from useThree if needed
        const h = frustumHeight / 2;
        const w = h * aspect;

        camRef.current.left = -w;
        camRef.current.right = w;
        camRef.current.top = h;
        camRef.current.bottom = -h;
        camRef.current.updateProjectionMatrix();
    });

    return (
        <OrthographicCamera
            ref={camRef}
            makeDefault
            near={0.1}
            far={50000}
            position={[0, 500, -500]}
        />
    );
}
