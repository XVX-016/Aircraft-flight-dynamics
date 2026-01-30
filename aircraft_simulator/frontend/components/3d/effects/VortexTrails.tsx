"use client";

import { Trail } from "@react-three/drei";
import * as THREE from "three";
import { useSim } from "@/lib/providers/SimProvider";

export default function VortexTrails() {
    const { derived } = useSim();
    const aoa = Math.abs((derived?.aoa ?? 0) * (180 / Math.PI));
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

