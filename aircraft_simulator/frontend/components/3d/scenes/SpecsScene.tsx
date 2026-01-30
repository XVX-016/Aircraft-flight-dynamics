"use client";

import { Float, Text, ContactShadows, useGLTF } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export default function SpecsScene() {
    const { scene } = useGLTF("/models/fighterplane/scene.gltf");

    return (
        <group>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                <primitive
                    object={scene}
                    scale={0.05}
                    rotation={[0, Math.PI / 1.5, 0]}
                />
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

useGLTF.preload("/models/fighterplane/scene.gltf");
