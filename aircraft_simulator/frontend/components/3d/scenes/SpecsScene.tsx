"use client";

import { Float, Text, ContactShadows } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export default function SpecsScene() {
    return (
        <group>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                {/* Mock Jet Group */}
                <group scale={1.2} rotation={[0, Math.PI / 1.5, 0]}>
                    {/* Fuselage */}
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[1.5, 1, 6]} />
                        <meshStandardMaterial color="#475569" />
                    </mesh>
                    {/* Wings */}
                    <mesh position={[2.5, 0, 1]}>
                        <boxGeometry args={[4, 0.1, 3]} />
                        <meshStandardMaterial color="#334155" />
                    </mesh>
                    <mesh position={[-2.5, 0, 1]}>
                        <boxGeometry args={[4, 0.1, 3]} />
                        <meshStandardMaterial color="#334155" />
                    </mesh>
                    {/* Tail */}
                    <mesh position={[0, 1, 2.5]}>
                        <boxGeometry args={[0.2, 2, 2]} />
                        <meshStandardMaterial color="#334155" />
                    </mesh>
                </group>
            </Float>

            {/* Technical Labels */}
            <group position={[0, 5, 0]}>
                <Text
                    fontSize={0.4}
                    color="#60a5fa"
                    font="/fonts/Inter-Bold.ttf"
                    anchorX="center"
                    anchorY="middle"
                >
                    J-20 MIGHTY DRAGON - SYSTEM ANATOMY
                </Text>
            </group>

            <ContactShadows
                position={[0, -2, 0]}
                opacity={0.3}
                scale={30}
                blur={2}
            />
        </group>
    );
}
