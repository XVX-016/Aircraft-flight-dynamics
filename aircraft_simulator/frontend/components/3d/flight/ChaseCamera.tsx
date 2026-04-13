"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { FlightState } from "@/hooks/useFlightSim";

interface ChaseCameraProps {
    state: FlightState | null;
}

/**
 * Chase camera: follows behind and above the aircraft in body frame.
 * Uses lerp for smooth following to avoid jittery snap.
 */
export default function ChaseCamera({ state }: ChaseCameraProps) {
    const camRef = useRef<THREE.PerspectiveCamera>(null);
    const smoothPos = useRef(new THREE.Vector3(0, 1000, 30));
    const smoothTarget = useRef(new THREE.Vector3(0, 1000, 0));

    useFrame(() => {
        if (!camRef.current || !state) return;

        // Aircraft position in Three.js coords (NED -> Three.js Y-up)
        // x_world = state.x, y_world = -state.z (Alt), z_world = -state.y
        const acX = state.x;
        const acY = -state.z;
        const acZ = -state.y;

        // Camera placement: 15m behind, 5m above in body frame (rotated by yaw)
        const yaw = -state.psi;
        const offsetDist = 15;
        const offsetUp = 5;

        const targetX = acX - Math.sin(yaw) * offsetDist;
        const targetZ = acZ - Math.cos(yaw) * offsetDist;
        const targetY = acY + offsetUp;

        // Tighter following with higher alpha to prevent lag-induced stutter at distance
        const alpha = 0.15;
        const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
        const lookTarget = new THREE.Vector3(acX, acY, acZ);

        smoothPos.current.lerp(targetPos, alpha);
        smoothTarget.current.lerp(lookTarget, alpha);

        camRef.current.position.copy(smoothPos.current);
        camRef.current.lookAt(smoothTarget.current);
    });

    return (
        <PerspectiveCamera
            ref={camRef}
            makeDefault
            fov={50}
            near={0.1}
            far={50000}
            position={[0, 1010, 30]}
        />
    );
}
