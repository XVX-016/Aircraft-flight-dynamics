"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Environment, Grid, OrbitControls } from "@react-three/drei";
import { useRef, useLayoutEffect } from "react";
import { Group, Quaternion, Vector3 } from "three";
import { simulationEngine } from "@/lib/simulation/simulation-engine";
import SimulationManager from "../logic/SimulationManager";
import FlowField from "./visuals/FlowField";
import { AircraftConfig } from "@/lib/simulation/types/aircraft";
import defaultAircraft from "@/lib/simulation/data/default_aircraft.json";

// Types
type AircraftConfigType = AircraftConfig;
const config = defaultAircraft as unknown as AircraftConfigType;

/**
 * Component that binds the 3D Object to the Physics State
 */
function PhysicsAircraftBinding({ scale }: { scale: number }) {
    const ref = useRef<Group>(null);

    // Run after physics update (priority typically doesn't matter much for simple read, 
    // but typically reading in useFrame is fine).
    useFrame((state) => {
        if (!ref.current) return;

        // 1. Get Interpolated State
        // useFrame state.clock.getElapsedTime()? 
        // Sync is tricky. For now, rely on buffer inside engine and just get 'latest safe render state'
        // Ideally we pass `state.clock.elapsedTime` to engine to find exact interpolation spot.
        const simState = simulationEngine.getRenderState(state.clock.elapsedTime);

        // 2. Apply Position (NED to Three.js conversion)
        // NED: x=North, y=East, z=Down
        // Three: x=Right, y=Up, z=Backward (OpenGL)
        // Mapping (Standard Aerospace -> Three.js/GL):
        // North (x_ned) -> -Z_gl (Forward) 
        // East (y_ned) -> X_gl (Right)
        // Down (z_ned) -> -Y_gl (Up)
        // BUT, simple 1-to-1 mapping for "Visual NED" might be easier:
        // Let's stick to standard GL frame for the SCENE and convert the aircraft.
        // Aircraft Body Frame: x=Forward, y=Right, z=Down.

        // Let's assume standard conventions:
        // Physics P: x, y, z.
        // Three P: x, z, -y? 

        // Let's implement a verified mapping:
        // Position:
        // x_gl = y_ned (East)
        // y_gl = -z_ned (Up = -Down)
        // z_gl = -x_ned (Backward = -North)

        ref.current.position.set(
            simState.p.y,
            -simState.p.z,
            -simState.p.x
        );

        // Attitude:
        // Physics Quaternion is Body -> NED.
        // We need Body -> GL.
        // Q_gl = Q_ned_to_gl * Q_body_to_ned
        // This math can get hairy. 
        // Simple approach: Apply NED rotation, then rotate the whole container to GL?

        // Or manually map components.
        // Let's try direct mapping if Quaternion is x,y,z,w standard.
        // Q_ned: (x, y, z, w)
        // ThreeJS uses same Layout.

        // Let's use the helper: setRotationFromQuaternion
        // But need to permute axes.
        // For now, let's just dump the raw quaternion and see (likely wrong).
        // Correct way: Construct Three.js quaternion from sim quaternion components mapped.

        // Temporary: Just set it.
        // ref.current.quaternion.set(simState.q.x, simState.q.y, simState.q.z, simState.q.w);

        // Better: 
        const qNed = simState.q;
        // The conversion from NED to ENU (GL-like) for Quaternions:
        // Swap X/Y, Invert Z?
        // Let's leave strictly as TODO for visual debugging.
        ref.current.quaternion.set(qNed.x, qNed.y, qNed.z, qNed.w);
    });

    return (
        <group ref={ref}>
            {/* Visual Aircraft Mesh */}
            {/* Placeholder Geometry */}
            <group scale={scale}>
                {/* Fuselage - Cone pointing +X (Body Forward) */}
                <mesh rotation={[0, 0, -Math.PI / 2]}>
                    <coneGeometry args={[1, 4, 32]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.4} />
                </mesh>
                {/* Wings */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[1.5, 0.1, 6]} /> {/* Wide span on Z body axis? Wait Body Y is Right. width on Y. */}
                    {/* If Body X=Forward, Body Y=Right, Body Z=Down */}
                    {/* Wings span along Y */}
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
                <axesHelper args={[5]} />
            </group>
        </group>
    );
}

// Camera Follower
function ChaseCamera() {
    // Implement spring arm logic later
    return <PerspectiveCamera makeDefault position={[10, 5, 10]} fov={60} />;
}

export default function SimulationScene() {
    return (
        <div className="w-full h-full absolute inset-0">
            <Canvas shadows>
                <SimulationManager />

                <ChaseCamera />
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                {/* The Aircraft */}
                <PhysicsAircraftBinding scale={config.scale} />

                {/* Flow Visualization */}
                <FlowField />

                {/* Ground Reference */}
                <Grid
                    infiniteGrid
                    fadeDistance={500}
                    fadeStrength={5}
                    sectionSize={10}
                    sectionColor="#444"
                    cellColor="#222"
                    position={[0, 0, 0]} // Usually at 0 altitude in GL. 
                // But our altitude is -z_ned. 0 is sea level.
                />

                <OrbitControls />
            </Canvas>
        </div>
    );
}
