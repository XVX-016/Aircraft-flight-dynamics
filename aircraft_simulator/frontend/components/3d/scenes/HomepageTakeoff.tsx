"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group } from "three";

export default function HomepageTakeoff() {
    const planeRef = useRef<Group>(null);
    const { scene } = useGLTF("/models/fighterplane/scene.gltf");

    useFrame((state, delta) => {
        if (planeRef.current) {
            // Constant rotation (Turntable style)
            planeRef.current.rotation.y += delta * 0.2;

            // Gentle bobbing
            planeRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
            planeRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
        }
    });

    return (
        <group>
            {/* Cinematic Lighting */}
            <spotLight
                position={[5, 10, 10]}
                angle={0.5}
                penumbra={1}
                intensity={5}
                castShadow
            />
            <pointLight position={[-10, -10, -10]} intensity={2} color="#00e680" />

            <primitive
                ref={planeRef}
                object={scene}
                scale={4.0}
                rotation={[0, Math.PI / 4, 0]}
                position={[0, 0, 0]}
            />
        </group>
    );
}

useGLTF.preload("/models/fighterplane/scene.gltf");
