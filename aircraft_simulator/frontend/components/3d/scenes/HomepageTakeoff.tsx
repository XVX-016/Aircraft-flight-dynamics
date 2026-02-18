"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group } from "three";
import AirflowParticles from "../airflow/AirflowParticles";

export default function HomepageTakeoff() {
    const planeRef = useRef<Group>(null);
    const { scene } = useGLTF("/models/fighterplane/scene.gltf");
    const { size } = useThree();

    const isMobile = size.width < 768;
    const modelScale = isMobile ? 1.5 : 2.5;

    useFrame(() => {
        if (planeRef.current) {
            return;
        }
    });

    return (
        <group>
            <spotLight
                position={[5, 10, 10]}
                angle={0.5}
                penumbra={1}
                intensity={5}
                castShadow
            />
            <pointLight position={[-10, -10, -10]} intensity={2} color="#00e680" />

            <group ref={planeRef} rotation={[0, -Math.PI / 2, 0]} position={[0, 0, 0]}>
                <primitive
                    object={scene}
                    scale={modelScale}
                    position={[0, 0, 0]}
                    rotation={[0, Math.PI, 0]}
                />
            </group>

            <AirflowParticles />
        </group>
    );
}

useGLTF.preload("/models/fighterplane/scene.gltf");
