'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';

export function AircraftView() {
    return (
        <div className="w-full h-full min-h-[400px] relative bg-[#020617] rounded-lg overflow-hidden">
            <Canvas
                camera={{ position: [5, 3, 5], fov: 35 }}
                shadows
                gl={{ antialias: true, alpha: true }}
            >
                <color attach="background" args={['#020617']} />
                <Suspense fallback={null}>
                    <ambientLight intensity={0.2} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} castShadow />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} color="#6366f1" />

                    <Grid
                        infiniteGrid
                        fadeDistance={25}
                        sectionSize={1.5}
                        sectionColor="#1e293b"
                        cellColor="#0f172a"
                        sectionThickness={1}
                        cellThickness={0.5}
                    />

                    {/* Placeholder for Aircraft Model with Shadow */}
                    <group position={[0, 0.5, 0]}>
                        <mesh castShadow receiveShadow>
                            <boxGeometry args={[2.5, 0.15, 0.8]} />
                            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
                        </mesh>
                        <mesh position={[1.1, 0.2, 0]} castShadow>
                            <boxGeometry args={[0.3, 0.4, 0.05]} />
                            <meshStandardMaterial color="#6366f1" />
                        </mesh>
                    </group>

                    {/* Floor for shadow catching */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                        <planeGeometry args={[100, 100]} />
                        <shadowMaterial transparent opacity={0.4} />
                    </mesh>

                    <OrbitControls
                        makeDefault
                        enableDamping
                        dampingFactor={0.05}
                        maxPolarAngle={Math.PI / 2}
                        minDistance={3}
                        maxDistance={15}
                    />
                    <Environment preset="night" />
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
