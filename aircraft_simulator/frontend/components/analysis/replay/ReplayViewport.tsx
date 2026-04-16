
"use client";

import React, { Suspense, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { FlightRecord } from "@/types/FlightRecord";

interface ReplayViewportProps {
    records: FlightRecord[];
    currentTime: number;
    aircraftId?: string;
}

export default function ReplayViewport({ records, currentTime, aircraftId = "cessna_172r" }: ReplayViewportProps) {
    const currentRecord = useMemo(() => {
        // Find closest record to currentTime
        if (records.length === 0) return null;
        let index = records.findIndex(r => r.time >= currentTime);
        if (index === -1) index = records.length - 1;
        return records[index];
    }, [records, currentTime]);

    return (
        <div className="hud-panel h-[500px] w-full border border-white/5 bg-black rounded-xl relative overflow-hidden">
            <div className="absolute top-4 left-4 z-10">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">3D Inspection Domain</div>
            </div>
            
            <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}>
                <PerspectiveCamera makeDefault position={[30, 20, 30]} fov={45} />
                <OrbitControls enablePan={true} makeDefault rotateSpeed={0.5} />
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={0.8} />
                <directionalLight position={[-10, 5, -10]} intensity={0.4} />
                
                <Suspense fallback={null}>
                    <Grid />
                    <HistoryTrail records={records} />
                    {currentRecord && (
                        <ReplayAircraft 
                            record={currentRecord} 
                            aircraftId={aircraftId} 
                        />
                    )}
                </Suspense>
            </Canvas>
        </div>
    );
}

function Grid() {
    return (
        <gridHelper 
            args={[1000, 50, 0x333333, 0x111111]} 
            position={[0, 0, 0]} 
            rotation={[0, 0, 0]}
        />
    );
}

const MODEL_PATHS: Record<string, string> = {
    cessna_172r: "/models/cessna-127/scene.gltf",
    f16_research: "/models/F-16/scene.gltf",
};

interface ReplayAircraftProps {
    record: FlightRecord;
    aircraftId: string;
}

function ReplayAircraft({ record, aircraftId }: ReplayAircraftProps) {
    const modelPath = MODEL_PATHS[aircraftId] || MODEL_PATHS.cessna_172r;
    const { scene } = useGLTF(modelPath);
    
    // Normalize and center model once
    const normalized = useMemo(() => {
        const root = scene.clone(true);
        root.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                obj.material = new THREE.MeshStandardMaterial({
                    color: "#cbd5e1",
                    metalness: 0.15,
                    roughness: 0.7,
                });
            }
        });
        
        const box = new THREE.Box3().setFromObject(root);
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        const wrapper = new THREE.Group();
        root.position.sub(center);
        wrapper.add(root);
        
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = 5.0 / Math.max(size.x, size.y, size.z, 0.1);
        wrapper.scale.setScalar(scale);
        
        return wrapper;
    }, [scene]);

    const groupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        if (!groupRef.current) return;
        
        // Transform NED -> Three.js (x, -z, -y)
        groupRef.current.position.set(record.x, -record.z, -record.y);
        
        // Orientation: theta, -psi, phi with YXZ order (radians)
        const d2r = Math.PI / 180;
        groupRef.current.rotation.set(
            record.theta_deg * d2r,
            -record.psi_deg * d2r,
            record.phi_deg * d2r,
            "YXZ"
        );
    }, [record]);

    return <primitive object={normalized} ref={groupRef} />;
}

function HistoryTrail({ records }: { records: FlightRecord[] }) {
    const geomRef = useRef<THREE.BufferGeometry>(null);
    const MAX_POINTS = 5000;
    
    const { positions, colors } = useMemo(() => {
        const count = Math.min(records.length - 1, MAX_POINTS);
        const posArr = new Float32Array(count * 2 * 3);
        const colArr = new Float32Array(count * 2 * 3);

        const velocityToColor = (v: number) => {
            const t = Math.max(0, Math.min(1, (v - 20) / (80 - 20)));
            const color = new THREE.Color();
            color.setHSL(0.66 * (1 - t), 1.0, 0.5);
            return color;
        };

        for (let i = 0; i < count; i++) {
            const a = records[i];
            const b = records[i + 1];
            
            const speed = Math.sqrt(a.u**2 + a.v**2 + a.w**2);
            const col = velocityToColor(speed);

            const offset = i * 6;
            // NED -> ThreeJS mapping
            posArr[offset] = a.x;
            posArr[offset+1] = -a.z;
            posArr[offset+2] = -a.y;
            
            posArr[offset+3] = b.x;
            posArr[offset+4] = -b.z;
            posArr[offset+5] = -b.y;

            colArr[offset] = col.r;
            colArr[offset+1] = col.g;
            colArr[offset+2] = col.b;
            
            colArr[offset+3] = col.r;
            colArr[offset+4] = col.g;
            colArr[offset+5] = col.b;
        }

        return { positions: posArr, colors: colArr };
    }, [records]);

    return (
        <lineSegments>
            <bufferGeometry ref={geomRef}>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[colors, 3]}
                />
            </bufferGeometry>
            <lineBasicMaterial vertexColors transparent opacity={0.5} />
        </lineSegments>
    );
}
