"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
interface HangarViewerProps {
    aircraftId: string | null;
    name: string | null;
    wingspan: number | null;
}

function AircraftModel({
    modelPath,
    paused,
}: {
    modelPath: string;
    paused: boolean;
}) {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF(modelPath);

    useEffect(() => {
        scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                obj.material = new THREE.MeshStandardMaterial({
                    color: "#cbd5e1",
                    metalness: 0.1,
                    roughness: 0.8,
                });
                obj.castShadow = false;
                obj.receiveShadow = false;
            }
        });
    }, [scene]);

    useFrame((_state, delta) => {
        if (!group.current || paused) return;
        group.current.rotation.y += delta * 0.087;
    });

    return <primitive object={scene} ref={group} />;
}

export default function HangarViewer({ aircraftId, name, wingspan }: HangarViewerProps) {
    const [paused, setPaused] = useState(false);
    const modelPath = useMemo(() => {
        if (!aircraftId) return null;
        if (aircraftId === "cessna_172r") return "/models/cessna-127/scene.gltf";
        if (aircraftId === "f16_research") return "/models/F-16/scene.gltf";
        return null;
    }, [aircraftId]);
    const cameraPos = useMemo(() => {
        if (!wingspan) return null;
        const xz = 1.2 * wingspan;
        const y = 0.4 * wingspan;
        return [xz, y, xz] as [number, number, number];
    }, [wingspan]);

    if (!modelPath || !wingspan || !cameraPos) {
        return (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center text-xs font-mono text-white/40">
                Select an aircraft to load 3D reference model.
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[400px] relative bg-black/20 rounded-xl overflow-hidden border border-white/5">
            <Canvas className="w-full h-full">
                <PerspectiveCamera
                    makeDefault
                    position={cameraPos}
                    fov={35}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                />
                <ambientLight intensity={0.3} />
                <directionalLight position={[5, 5, 5]} intensity={0.6} />
                <directionalLight position={[-5, 2, -5]} intensity={0.3} />

                <Suspense fallback={null}>
                    <group
                        onPointerOver={() => setPaused(true)}
                        onPointerOut={() => setPaused(false)}
                    >
                        <AircraftModel key={modelPath} modelPath={modelPath} paused={paused} />
                    </group>
                </Suspense>
            </Canvas>

            <div className="absolute bottom-4 left-4 pointer-events-none">
                <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">{name ?? "No Aircraft Selected"}</h2>
                <p className="text-xs text-white/50 font-mono">{aircraftId ?? "--"}</p>
            </div>
        </div>
    );
}
