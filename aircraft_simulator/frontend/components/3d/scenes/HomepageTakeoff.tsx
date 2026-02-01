"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group } from "three";
import AirflowParticles from "../airflow/AirflowParticles";

export default function HomepageTakeoff() {
    const planeRef = useRef<Group>(null);
    const { scene } = useGLTF("/models/fighterplane/scene.gltf");

    useFrame((state, delta) => {
        if (planeRef.current) {
            // Static orientation as requested ("Locked")
            // Slight mouse parallax could be added here later if needed
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

            {/* Aircraft Group - Profile View (Nose Right) */}
            <group ref={planeRef} rotation={[0, -Math.PI / 2, 0]} position={[0, -1.5, 0]}>
                <primitive
                    object={scene}
                    scale={4.0}
                    rotation={[0, Math.PI, 0]}
                    position={[0, 0, 0]}
                />
            </group>

            {/* Physics-Based Airflow (GPU) */}
            <AirflowParticles />
        </group>
    );
}

useGLTF.preload("/models/fighterplane/scene.gltf");
