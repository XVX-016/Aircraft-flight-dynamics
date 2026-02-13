"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Loader, Environment } from "@react-three/drei";
import { useSimulationStore } from "@/stores/useSimulationStore";
import HomepageTakeoff from "./scenes/HomepageTakeoff";
import HangarScene from "./scenes/HangarScene";
import SpecsScene from "./scenes/SpecsScene";
import EstimationScene from "./scenes/EstimationScene";
import CameraRig from "./CameraRig";
import PerformanceController from "./PerformanceController";

export default function SceneRoot() {
    const sceneState = useSimulationStore((state) => state.sceneState);

    return (
        <div className="w-full h-full absolute inset-0 -z-10 pointer-events-none">
            <Canvas
                dpr={[1, 2]}
                gl={{
                    antialias: true,
                    powerPreference: "high-performance",
                    alpha: false,
                }}
                camera={{ fov: 45, near: 0.1, far: 5000 }}
                shadows
            >
                <color attach="background" args={["#020617"]} />

                <Suspense fallback={null}>
                    {/* Persistent Environment - stays warm across pages */}
                    {/* Using a preset as fallback if custom HDRI is missing */}
                    <Environment
                        preset="city"
                        background={false}
                    />

                    <ambientLight intensity={0.4} />
                    <directionalLight
                        position={[5, 10, 5]}
                        intensity={1.2}
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                    />

                    <CameraRig />
                    <PerformanceController />

                    {/* Global Scene Logic */}
                    {sceneState === 'takeoff' && <HomepageTakeoff />}
                    {sceneState === 'hangar' && <HangarScene />}
                    {sceneState === 'specs' && <SpecsScene />}
                    {sceneState === 'estimation' && <EstimationScene />}
                    {/* Other scenes will be added here */}
                </Suspense>
            </Canvas>
            <Loader />
        </div>
    );
}
