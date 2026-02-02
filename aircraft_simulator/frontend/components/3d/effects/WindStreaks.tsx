"use client";

import { Instances, Instance } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group } from "three";
import { useSimulationStore } from "@/stores/useSimulationStore";

export default function WindStreaks() {
    const instancesRef = useRef<Group>(null);
    const qualityTier = useSimulationStore((state) => state.qualityTier);

    const limit = qualityTier === 'high' ? 100 : qualityTier === 'mid' ? 50 : 20;

    useFrame((state, delta) => {
        if (instancesRef.current) {
            instancesRef.current.children.forEach((instance: any) => {
                // Move streaks towards the camera (speed illusion)
                instance.position.z += delta * 120;

                // Reset when they pass the camera
                if (instance.position.z > 20) {
                    instance.position.z = -200 - Math.random() * 100;
                    instance.position.x = (Math.random() - 0.5) * 40;
                    instance.position.y = (Math.random() - 0.5) * 20;
                }
            });
        }
    });

    return (
        <Instances limit={limit} range={limit}>
            <planeGeometry args={[0.02, 5]} />
            <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.3}
                depthWrite={false}
                blending={2} // Additive blending
                side={2} // Double side
            />
            <group ref={instancesRef}>
                {Array.from({ length: limit }).map((_, i) => (
                    <Instance
                        key={i}
                        rotation={[Math.PI / 2, 0, 0]}
                        position={[
                            (Math.random() - 0.5) * 60,
                            (Math.random() - 0.5) * 30,
                            -Math.random() * 200
                        ]}
                    />
                ))}
            </group>
        </Instances>
    );
}
