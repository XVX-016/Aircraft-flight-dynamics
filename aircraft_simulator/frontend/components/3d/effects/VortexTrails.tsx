"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail, Float } from "@react-three/drei";
import * as THREE from "three";
import { useSimulationStore } from "@/stores/useSimulationStore";

export default function VortexTrails() {
    const { orientation } = useSimulationStore();
    const aoa = Math.abs(orientation[1] * (180 / Math.PI));
    const intensity = Math.max(0, (aoa - 10) / 10); // Start appearing after 10 degrees AoA

    return (
        <group>
            {/* Left Wingtip */}
            <Trail
                width={intensity * 0.5}
                length={8}
                color={new THREE.Color("#ffffff")}
                attenuation={(t) => t * t}
            >
                <mesh position={[-7.5, 0, 2]} />
            </Trail>

            {/* Right Wingtip */}
            <Trail
                width={intensity * 0.5}
                length={8}
                color={new THREE.Color("#ffffff")}
                attenuation={(t) => t * t}
            >
                <mesh position={[7.5, 0, 2]} />
            </Trail>
        </group>
    );
}
