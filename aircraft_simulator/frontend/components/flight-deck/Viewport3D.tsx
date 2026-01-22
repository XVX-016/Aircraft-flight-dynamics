"use client";

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, ContactShadows, Environment, Grid } from '@react-three/drei';
import AircraftModel from './AircraftModel';

export default function Viewport3D() {
    return (
        <div className="w-full h-full bg-slate-950 absolute inset-0">
            <Canvas shadows camera={{ position: [5, 2, 5], fov: 50 }}>
                {/* Environment */}
                <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
                <Environment preset="city" />
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                <directionalLight position={[-5, 5, 5]} intensity={0.5} castShadow />

                {/* The Star of the Show */}
                <AircraftModel />

                {/* Ground Reference */}
                <Grid
                    position={[0, -2, 0]}
                    args={[100, 100]}
                    cellSize={1}
                    cellThickness={0.5}
                    sectionSize={5}
                    sectionThickness={1}
                    fadeDistance={50}
                    sectionColor="#22d3ee"
                    cellColor="#1e293b"
                />
                <ContactShadows position={[0, -2, 0]} opacity={0.6} scale={20} blur={2.5} far={4} color="#000000" />

                {/* Controls */}
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.8} />
            </Canvas>
        </div>
    );
}
