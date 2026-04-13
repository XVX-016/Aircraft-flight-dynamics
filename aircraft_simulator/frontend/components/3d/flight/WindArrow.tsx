"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useFlightSimContext } from "@/context/FlightSimContext";

/**
 * Wind vector visualization.
 * Shows an arrow pointing in the direction of the steady wind.
 * Scaled by wind magnitude.
 */
export default function WindArrow() {
    const { state, packet } = useFlightSimContext();
    const arrowRef = useRef<THREE.ArrowHelper>(null);

    // Wind in NED → Three.js: (windN, -windD, -windE)
    // Packet structure: wind_ned: { n, e, d }
    const wind = packet?.wind_ned;
    const magnitude = wind ? Math.sqrt(wind.n ** 2 + wind.e ** 2 + wind.d ** 2) : 0;

    useFrame(() => {
        if (!arrowRef.current || !state || !wind) return;

        // Position: 5 meters above the aircraft to avoid clipping
        arrowRef.current.position.set(state.x, -state.z + 5, -state.y);

        // Direction: Map NED (N, E, D) to Three.js (X, -Z, -Y)
        // For horizontal wind arrow, we usually ignore D (vertical) or include it
        const dir = new THREE.Vector3(wind.n, -wind.d, -wind.e).normalize();
        arrowRef.current.setDirection(dir);

        // Length: scaling factor 0.5 for visibility
        arrowRef.current.setLength(magnitude * 0.5, 0.5, 0.3);
    });

    if (!wind || magnitude < 0.1) return null;

    return (
        <primitive
            object={new THREE.ArrowHelper(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(0, 0, 0),
                1,
                0x60a5fa, // Blue-ish matching altitude chart
                0.5,
                0.3
            )}
            ref={arrowRef}
        />
    );
}
