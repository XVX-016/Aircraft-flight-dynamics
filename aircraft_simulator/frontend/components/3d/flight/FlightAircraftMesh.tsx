"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { FlightState } from "@/hooks/useFlightSim";

const MODEL_PATHS: Record<string, string[]> = {
    cessna_172r: ["/models/cessna-127/scene.gltf"],
    f16_research: ["/models/F-16/scene.gltf", "/models/fighterplane/scene.gltf"],
};

const DEFAULT_AIRCRAFT = "cessna_172r";

interface FlightAircraftMeshProps {
    state: FlightState | null;
    aircraftId: string | null;
    classification: string | null;
    wingspan: number | null;
}

export default function FlightAircraftMesh({ state, aircraftId, classification, wingspan }: FlightAircraftMeshProps) {
    const effectiveId = aircraftId || DEFAULT_AIRCRAFT;
    const isCustom = effectiveId.startsWith("custom-");
    
    // Built-in aircraft mapping
    const paths = useMemo(() => {
        return MODEL_PATHS[effectiveId] ?? MODEL_PATHS[DEFAULT_AIRCRAFT];
    }, [effectiveId]);

    const modelPath = paths[0];

    return (
        <group>
            {isCustom ? (
                <ProceduralAircraft state={state} wingspan={wingspan} />
            ) : (
                <MeshInner state={state} modelPath={modelPath} />
            )}
        </group>
    );
}

function ProceduralAircraft({ state, wingspan }: { state: FlightState | null; wingspan: number | null }) {
    const groupRef = useRef<THREE.Group>(null);
    const span = wingspan || 10;

    useFrame(() => {
        if (!groupRef.current || !state) return;
        groupRef.current.position.set(state.x, -state.z, -state.y);
        groupRef.current.rotation.set(state.theta, -state.psi, state.phi, "YXZ");
    });

    return (
        <group ref={groupRef}>
            {/* Fuselage */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[2, 0.3, 0.3]} />
                <meshBasicMaterial color="#444444" wireframe={true} />
            </mesh>
            {/* Wings */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[span, 0.1, 1.5]} />
                <meshBasicMaterial color="#444444" wireframe={true} />
            </mesh>
            {/* Tail Vertical Fin */}
            <mesh position={[-0.8, 0.3, 0]}>
                <boxGeometry args={[0.5, 0.5, 0.1]} />
                <meshBasicMaterial color="#444444" wireframe={true} />
            </mesh>
            {/* Tail Horizontal Stab */}
            <mesh position={[-0.8, 0, 0]}>
                <boxGeometry args={[0.5, 0.05, 2.5]} />
                <meshBasicMaterial color="#444444" wireframe={true} />
            </mesh>
        </group>
    );
}

function MeshInner({ state, modelPath }: { state: FlightState | null; modelPath: string }) {
    const groupRef = useRef<THREE.Group>(null);
    const gltf = useGLTF(modelPath);

    const normalized = useMemo(() => {
        const root = gltf.scene.clone(true);
        root.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                obj.material = new THREE.MeshStandardMaterial({
                    color: "#cbd5e1",
                    metalness: 0.15,
                    roughness: 0.7,
                });
                obj.castShadow = false;
                obj.receiveShadow = false;
            }
        });

        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
        const targetDim = 6.0;
        const scale = targetDim / maxDim;

        const wrapper = new THREE.Group();
        root.position.sub(center);
        wrapper.add(root);
        wrapper.scale.setScalar(scale);
        return wrapper;
    }, [gltf.scene]);

    useFrame(() => {
        if (!groupRef.current || !state) return;

        // NED → Three.js (Y-up)
        // x_ned → x_three, -z_ned → y_three (altitude up), -y_ned → z_three
        groupRef.current.position.set(
            state.x,
            -state.z,
            -state.y,
        );

        // Euler mapping: pitch→X, yaw→Y (negated), roll→Z, order YXZ
        groupRef.current.rotation.set(
            state.theta,
            -state.psi,
            state.phi,
            "YXZ",
        );
    });

    return <primitive object={normalized} ref={groupRef} />;
}
