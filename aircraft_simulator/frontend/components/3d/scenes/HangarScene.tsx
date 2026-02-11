"use client";

import { useRef } from "react";
import { useGLTF, ContactShadows } from "@react-three/drei";
import { Group } from "three";
import AirflowField from "../airflow/AirflowField";
import VortexTrails from "../effects/VortexTrails";
import { AIRCRAFT_SCALE, AIRCRAFT_POSITION } from "@/lib/simulation/sceneConstants";

export default function HangarScene() {
    const planeRef = useRef<Group>(null);
    const airflowEnabled = false;
    const { scene } = useGLTF("/models/fighterplane/scene.gltf");

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

            {/* The Aircraft on a Platform - Rotated to face right (Sideways view) */}
            <group ref={planeRef} position={AIRCRAFT_POSITION} rotation={[0, Math.PI / 2, 0]}>
                <primitive
                    object={scene}
                    scale={AIRCRAFT_SCALE}
                    rotation={[0, Math.PI, 0]}
                    castShadow
                    receiveShadow
                />

                {/* Airflow Visualization Overlay */}
                {airflowEnabled && <AirflowField visibleStatic direction={[-1, 0, 0]} />}
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

useGLTF.preload("/models/fighterplane/scene.gltf");
