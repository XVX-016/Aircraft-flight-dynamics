"use client";

import { useRef } from "react";
import { ContactShadows, Environment } from "@react-three/drei";
import { Group } from "three";
import { useSimulationStore } from "@/stores/useSimulationStore";
import AirflowField from "../airflow/AirflowField";
import VortexTrails from "../effects/VortexTrails";

export default function HangarScene() {
    const planeRef = useRef<Group>(null);
    const airflowEnabled = true; // Placeholder for toggle

    return (
        <group>
            {/* Neutral Studio Lighting */}
            <ambientLight intensity={0.2} />
            <spotLight
                position={[10, 15, 10]}
                angle={0.3}
                penumbra={1}
                intensity={2}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />
            <rectAreaLight
                width={10}
                height={10}
                intensity={5}
                position={[-10, 5, 0]}
                rotation={[0, Math.PI / 2, 0]}
            />

            {/* The Aircraft on a Platform */}
            <group ref={planeRef} position={[0, 0, 0]}>
                {/* Mock Jet */}
                <group scale={1.2} rotation={[0, Math.PI, 0]}>
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[1.5, 1, 6]} />
                        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.8} />
                    </mesh>
                    <mesh position={[2.5, 0, 1]} castShadow receiveShadow>
                        <boxGeometry args={[4, 0.1, 3]} />
                        <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
                    </mesh>
                    <mesh position={[-2.5, 0, 1]} castShadow receiveShadow>
                        <boxGeometry args={[4, 0.1, 3]} />
                        <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
                    </mesh>
                    <mesh position={[0, 1, 2.5]} castShadow receiveShadow>
                        <boxGeometry args={[0.2, 2, 2]} />
                        <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
                    </mesh>
                </group>

                {/* Airflow Visualization Overlay */}
                {airflowEnabled && <AirflowField />}
                <VortexTrails />
            </group>

            {/* Technical Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.2} />
            </mesh>

            <gridHelper args={[50, 50, "#1e293b", "#0f172a"]} position={[0, 0, 0]} />

            <ContactShadows
                position={[0, 0, 0]}
                opacity={0.4}
                scale={20}
                blur={2}
                far={4.5}
            />
        </group>
    );
}
