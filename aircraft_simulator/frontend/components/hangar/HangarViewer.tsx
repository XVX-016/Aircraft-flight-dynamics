"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Grid, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
import { AircraftConfig } from "@/lib/simulation/types/aircraft";

interface HangarViewerProps {
    config: AircraftConfig;
}

function AircraftModel({ meshUrl, scale }: { meshUrl: string, scale: number }) {
    // Placeholder for now. Eventually load GLTF.
    // Simpler primitive fallback if GLB loading fails or is not configured.
    return (
        <group scale={scale}>
            <mesh>
                <coneGeometry args={[1, 4, 32]} />
                <meshStandardMaterial color="#333" roughness={0.4} metalness={0.8} />
                <axesHelper args={[5]} />
            </mesh>
            {/* Wings */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.2, 8, 1.5]} />
                <meshStandardMaterial color="#444" />
            </mesh>
            {/* Tail */}
            <mesh position={[0, -1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[2, 0.2, 1]} />
                <meshStandardMaterial color="#444" />
            </mesh>
        </group>
    );
}

export default function HangarViewer({ config }: HangarViewerProps) {
    return (
        <div className="w-full h-full min-h-[500px] relative bg-black/20 rounded-xl overflow-hidden border border-white/5">
            <Canvas shadows className="w-full h-full">
                <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
                <Suspense fallback={null}>
                    <Stage environment="city" intensity={0.5} adjustCamera={false}>
                        <AircraftModel meshUrl={config.meshUrl} scale={config.scale} />
                    </Stage>
                </Suspense>

                <Grid
                    infiniteGrid
                    fadeDistance={30}
                    fadeStrength={5}
                    sectionSize={1}
                    sectionThickness={1}
                    sectionColor="#808080"
                    cellSize={0.5}
                    cellThickness={0.5}
                    cellColor="#333333"
                />

                <OrbitControls autoRotate autoRotateSpeed={0.5} makeDefault />
            </Canvas>

            <div className="absolute bottom-4 left-4 pointer-events-none">
                <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">{config.name}</h2>
                <p className="text-xs text-white/50 font-mono">{config.id}</p>
            </div>
        </div>
    );
}
