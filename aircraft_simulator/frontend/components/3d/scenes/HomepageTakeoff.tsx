"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import WindStreaks from "../effects/WindStreaks";
import { Group } from "three";

export default function HomepageTakeoff() {
    const planeRef = useRef<Group>(null);

    useFrame((state, delta) => {
        if (planeRef.current) {
            // Subtle roll/pitch bobbing
            planeRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
            planeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.02;

            // Subtle vibration
            planeRef.current.position.y = Math.sin(state.clock.elapsedTime * 10) * 0.005;
        }
    });

    return (
        <group>
            <spotLight
                position={[10, 10, 10]}
                angle={0.15}
                penumbra={1}
                intensity={2}
                castShadow
            />

            <group
                ref={planeRef}
                scale={1.5}
                rotation={[0, Math.PI, 0]}
                position={[0, 0, 0]}
            >
                {/* Mock Jet */}
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[1.5, 1, 6]} />
                    <meshStandardMaterial color="#cbd5e1" />
                </mesh>
                <mesh position={[2.5, 0, 1]} castShadow receiveShadow>
                    <boxGeometry args={[4, 0.1, 3]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
                <mesh position={[-2.5, 0, 1]} castShadow receiveShadow>
                    <boxGeometry args={[4, 0.1, 3]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
                <mesh position={[0, 1, 2.5]} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 2, 2]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
            </group>

            <WindStreaks />
        </group>
    );
}
