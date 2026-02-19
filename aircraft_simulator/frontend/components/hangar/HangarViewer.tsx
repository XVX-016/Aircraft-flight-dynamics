"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import React, { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface HangarViewerProps {
    aircraftId: string | null;
    name: string | null;
    wingspan: number | null;
}

const MODEL_PATHS: Record<string, string[]> = {
    cessna_172r: ["/models/cessna-127/scene.gltf"],
    f16_research: ["/models/F-16/scene.gltf", "/models/fighterplane/scene.gltf"],
};

function AircraftModel({
    modelPath,
    paused,
    onReady,
}: {
    modelPath: string;
    paused: boolean;
    onReady: () => void;
}) {
    const group = useRef<THREE.Group>(null);
    const gltf = useGLTF(modelPath);
    const normalized = useMemo(() => {
        const root = gltf.scene.clone(true);
        root.traverse((obj) => {
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

        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
        const targetDim = 6.0;
        const scale = targetDim / maxDim;

        const wrapper = new THREE.Group();
        // Center first, then scale at parent level so translation is scaled too.
        root.position.sub(center);
        wrapper.add(root);
        wrapper.scale.setScalar(scale);
        return wrapper;
    }, [gltf.scene]);

    useFrame((_state, delta) => {
        if (!group.current || paused) return;
        group.current.rotation.y += delta * 0.087;
    });

    React.useEffect(() => {
        onReady();
    }, [onReady]);

    return <primitive object={normalized} ref={group} />;
}

function FallbackModel({ paused }: { paused: boolean }) {
    const group = useRef<THREE.Group>(null);
    useFrame((_state, delta) => {
        if (!group.current || paused) return;
        group.current.rotation.y += delta * 0.087;
    });
    return (
        <group ref={group}>
            <mesh>
                <boxGeometry args={[6, 1.2, 1.2]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.1} roughness={0.8} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.2, 7.5, 1.5]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.1} roughness={0.8} />
            </mesh>
        </group>
    );
}

class ModelErrorBoundary extends React.Component<
    { onError: () => void; children: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch() {
        this.props.onError();
    }

    componentDidUpdate(prevProps: { children: React.ReactNode }) {
        if (prevProps.children !== this.props.children && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

export default function HangarViewer({ aircraftId, name, wingspan }: HangarViewerProps) {
    const paths = useMemo(() => (aircraftId ? MODEL_PATHS[aircraftId] ?? [] : []), [aircraftId]);

    const cameraPos = useMemo(() => {
        if (!wingspan) return null;
        const xz = 1.2 * wingspan;
        const y = 0.4 * wingspan;
        return [xz, y, xz] as [number, number, number];
    }, [wingspan]);

    if (!wingspan || !cameraPos || paths.length === 0) {
        return (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center text-xs font-mono text-white/40">
                Select an aircraft to load 3D reference model.
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[400px] relative overflow-hidden border border-white/10 bg-black">
            <HangarCanvas key={aircraftId ?? "none"} paths={paths} cameraPos={cameraPos} />
            <div className="pointer-events-none absolute bottom-4 left-4">
                <h2 className="text-2xl font-bold uppercase tracking-tighter text-white">{name ?? "No Aircraft Selected"}</h2>
            </div>
        </div>
    );
}

function HangarCanvas({ paths, cameraPos }: { paths: string[]; cameraPos: [number, number, number] }) {
    const [paused, setPaused] = useState(false);
    const [pathIndex, setPathIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const modelPath = paths[pathIndex] ?? null;

    const handleModelError = () => {
        setPathIndex((prev) => (prev + 1 < paths.length ? prev + 1 : prev));
        setLoading(true);
    };

    return (
        <div className="relative h-full w-full">
            {loading && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[11px] font-mono text-white/45">
                    Loading 3D model...
                </div>
            )}
            <Canvas
                className="w-full h-full"
                dpr={[1, 1.5]}
                gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
            >
                <PerspectiveCamera makeDefault position={cameraPos} fov={35} onUpdate={(c) => c.lookAt(0, 0, 0)} />
                <ambientLight intensity={0.3} />
                <directionalLight position={[5, 5, 5]} intensity={0.6} />
                <directionalLight position={[-5, 2, -5]} intensity={0.3} />
                <OrbitControls
                    enablePan={false}
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={4}
                    maxDistance={40}
                    minPolarAngle={Math.PI * 0.2}
                    maxPolarAngle={Math.PI * 0.8}
                    onStart={() => setPaused(true)}
                    onEnd={() => setPaused(false)}
                />

                <group onPointerOver={() => setPaused(true)} onPointerOut={() => setPaused(false)}>
                    <Suspense fallback={null}>
                        {modelPath ? (
                            <ModelErrorBoundary onError={handleModelError}>
                                <AircraftModel
                                    key={modelPath}
                                    modelPath={modelPath}
                                    paused={paused}
                                    onReady={() => setLoading(false)}
                                />
                            </ModelErrorBoundary>
                        ) : (
                            <FallbackModel paused={paused} />
                        )}
                    </Suspense>
                </group>
            </Canvas>
        </div>
    );
}
