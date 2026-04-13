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
}

export default function FlightAircraftMesh({ state, aircraftId }: FlightAircraftMeshProps) {
    const effectiveId = aircraftId || DEFAULT_AIRCRAFT;
    const paths = MODEL_PATHS[effectiveId] ?? MODEL_PATHS[DEFAULT_AIRCRAFT];
    const modelPath = paths[0];

    return (
        <group>
            <MeshInner state={state} modelPath={modelPath} />
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
