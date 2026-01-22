"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { Group } from "three";

export default function AircraftModel() {
    const aircraftRef = useRef<Group>(null);
    const { orientation, controls } = useSimulationStore();

    useFrame(() => {
        if (aircraftRef.current) {
            // Smooth interpolation would go here in a real implementation
            // For now, direct mapping for responsiveness
            aircraftRef.current.rotation.x = orientation[0]; // Roll
            aircraftRef.current.rotation.y = -orientation[2]; // Yaw (Heading) - Three.js Y is up
            aircraftRef.current.rotation.z = -orientation[1]; // Pitch

            // Basic "flight" bobbing
            aircraftRef.current.position.y = Math.sin(Date.now() / 1000) * 0.5;
        }
    });

    return (
        <group ref={aircraftRef}>
            {/* Visual Placeholder: A sleek futuristic jet/drone shape */}
            {/* Fuselage */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
                <capsuleGeometry args={[0.5, 4, 4, 16]} />
                <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
            </mesh>

            {/* Cockpit */}
            <mesh position={[0, 0.5, 1]} rotation={[0.3, 0, 0]}>
                <capsuleGeometry args={[0.35, 1.5, 4, 12]} />
                <meshPhysicalMaterial
                    color="#0ea5e9"
                    transmission={0.6}
                    roughness={0.1}
                    metalness={0.1}
                    thickness={0.5}
                />
            </mesh>

            {/* Wings */}
            <mesh position={[0, 0, -0.5]}>
                <boxGeometry args={[6, 0.1, 1.5]} />
                <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.6} />
            </mesh>

            {/* Vertical Stabilizer */}
            <mesh position={[0, 1, -1.8]}>
                <boxGeometry args={[0.1, 1.5, 1]} />
                <meshStandardMaterial color="#475569" />
            </mesh>

            {/* Horizontal Stabilizer */}
            <mesh position={[0, 0.2, -1.8]}>
                <boxGeometry args={[2.5, 0.1, 0.8]} />
                <meshStandardMaterial color="#475569" />
            </mesh>

            {/* Control Surface Visualization (Ailerons) */}
            <group position={[2, 0, -0.5]} rotation={[controls.aileron * 0.5, 0, 0]}>
                <mesh position={[0, 0, 0.4]}>
                    <boxGeometry args={[1.8, 0.08, 0.3]} />
                    <meshStandardMaterial color="#cbd5e1" />
                </mesh>
            </group>
            <group position={[-2, 0, -0.5]} rotation={[-controls.aileron * 0.5, 0, 0]}>
                <mesh position={[0, 0, 0.4]}>
                    <boxGeometry args={[1.8, 0.08, 0.3]} />
                    <meshStandardMaterial color="#cbd5e1" />
                </mesh>
            </group>
        </group>
    );
}
