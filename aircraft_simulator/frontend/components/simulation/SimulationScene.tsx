"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Environment, Grid, OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import { Group } from "three";
import { useSim } from "@/lib/providers/SimProvider";
import FlowField from "./visuals/FlowField";
import { AircraftConfig } from "@/lib/simulation/types/aircraft";
import defaultAircraft from "@/lib/simulation/data/default_aircraft.json";

// Types
type AircraftConfigType = AircraftConfig;
const config = defaultAircraft as unknown as AircraftConfigType;

/**
 * Component that binds the 3D Object to the Physics State
 * Now reads from useSim() context instead of direct engine access.
 */
function PhysicsAircraftBinding({ scale }: { scale: number }) {
    const ref = useRef<Group>(null);
    const { truthState } = useSim();

    useFrame(() => {
        if (!ref.current || !truthState) return;

        // NED to Three.js conversion:
        // x_gl = y_ned (East)
        // y_gl = -z_ned (Up = -Down)
        // z_gl = -x_ned (Backward = -North)
        ref.current.position.set(
            truthState.p.y,
            -truthState.p.z,
            -truthState.p.x
        );

        // Apply quaternion (NED to GL conversion TODO)
        const qNed = truthState.q;
        ref.current.quaternion.set(qNed.x, qNed.y, qNed.z, qNed.w);
    });

    return (
        <group ref={ref}>
            <group scale={scale}>
                {/* Fuselage */}
                <mesh rotation={[0, 0, -Math.PI / 2]}>
                    <coneGeometry args={[1, 4, 32]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.4} />
                </mesh>
                {/* Wings */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[1.5, 0.1, 6]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
                <axesHelper args={[5]} />
            </group>
        </group>
    );
}

function ChaseCamera() {
    return <PerspectiveCamera makeDefault position={[10, 5, 10]} fov={60} />;
}

export default function SimulationScene() {
    return (
        <div className="w-full h-full absolute inset-0">
            <Canvas shadows>
                {/* SimulationManager REMOVED — physics loop now runs in SimProvider */}

                <ChaseCamera />
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                <PhysicsAircraftBinding scale={config.scale} />
                <FlowField />

                <Grid
                    infiniteGrid
                    fadeDistance={500}
                    fadeStrength={5}
                    sectionSize={10}
                    sectionColor="#444"
                    cellColor="#222"
                    position={[0, 0, 0]}
                />

                <OrbitControls />
            </Canvas>
        </div>
    );
}

