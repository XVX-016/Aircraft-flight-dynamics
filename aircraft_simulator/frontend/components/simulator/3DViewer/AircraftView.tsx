'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';

export function AircraftView() {
    return (
        <div className="w-full h-full min-h-[400px] relative bg-slate-900/50 rounded-lg overflow-hidden border border-slate-800">
            <Canvas
                camera={{ position: [5, 5, 5], fov: 45 }}
                shadows
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                    <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />

                    <Grid
                        infiniteGrid
                        fadeDistance={30}
                        sectionSize={1.5}
                        sectionColor="#334155"
                        cellColor="#1e293b"
                    />

                    {/* Placeholder for Aircraft Model */}
                    <mesh position={[0, 0.5, 0]}>
                        <boxGeometry args={[2, 0.2, 1]} />
                        <meshStandardMaterial color="#3b82f6" />
                    </mesh>
                    <mesh position={[1, 0.5, 0]}>
                        <boxGeometry args={[0.5, 0.5, 0.1]} />
                        <meshStandardMaterial color="#F59E0B" />
                    </mesh>

                    <OrbitControls makeDefault />
                    <Environment preset="city" />
                </Suspense>
            </Canvas>
            <div className="absolute top-4 left-4 pointer-events-none">
                <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-success rounded-full animate-pulse" />
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">System Online</span>
                </div>
            </div>
        </div>
    );
}
