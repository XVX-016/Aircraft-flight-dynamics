"use client";

import Link from "next/link";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { Environment } from "@react-three/drei";
import HomepageTakeoff from "@/components/3d/scenes/HomepageTakeoff";
import * as THREE from "three";

function ResponsiveCamera() {
    const { size, camera } = useThree();
    const target = useRef(new THREE.Vector3(5, 2, 8));
    const settled = useRef(false);
    const lastMobile = useRef<boolean | null>(null);

    useFrame(() => {
        const isMobile = size.width < 768;

        if (lastMobile.current !== isMobile) {
            lastMobile.current = isMobile;
            settled.current = false;
            target.current.set(
                isMobile ? 3 : 5,
                isMobile ? 4 : 2,
                isMobile ? 20 : 8
            );
        }

        if (settled.current) return;

        const dist = camera.position.distanceTo(target.current);
        if (dist > 0.01) {
            camera.position.lerp(target.current, 0.1);
            camera.lookAt(0, 0, 0);
        } else {
            camera.position.copy(target.current);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
            settled.current = true;
        }
    });

    return null;
}

const HeroSection = () => {
    return (
        <section className="relative h-screen w-full overflow-hidden flex flex-col items-center justify-center bg-black">
            <div className="absolute inset-0">
                <Canvas
                    dpr={1}
                    gl={{
                        antialias: true,
                        powerPreference: "high-performance",
                        alpha: false,
                    }}
                    camera={{ position: [5, 2, 8], fov: 50, near: 0.1, far: 5000 }}
                >
                    <color attach="background" args={["#020617"]} />
                    <Suspense fallback={null}>
                        <Environment preset="city" background={false} />
                        <ambientLight intensity={0.4} />
                        <directionalLight
                            position={[5, 10, 5]}
                            intensity={1.2}
                        />
                        <ResponsiveCamera />
                        <HomepageTakeoff />
                    </Suspense>
                </Canvas>
            </div>

            <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-b from-transparent to-black z-10 pointer-events-none" />

            <div className="relative z-20 text-center max-w-[1400px] mx-auto px-6 md:px-8 h-full flex flex-col justify-center">
                <div className="mb-8 relative">
                    <h1 className="text-[clamp(3rem,12vw,12rem)] md:text-[clamp(4rem,15vw,12rem)] font-black leading-[0.8] tracking-tighter text-white">
                        Precision
                        <br />
                        Flight
                    </h1>

                    <h2 className="text-[clamp(1.5rem,5vw,5rem)] md:text-[clamp(2rem,6vw,5rem)] font-bold tracking-tight mt-2 text-stroke">
                        Dynamics & Control
                    </h2>
                </div>

                <p className="text-[10px] md:text-xs text-white/40 tracking-[0.3em] uppercase mb-12 max-w-2xl mx-auto leading-relaxed">
                    Advanced attitude determination and control simulation platform
                </p>

                <div className="flex flex-col items-center gap-12">
                    <Link
                        href="/hangar"
                        className="w-full sm:w-auto px-8 sm:px-12 py-4 border border-white/20 bg-white/5 text-white/80 text-xs font-mono tracking-[0.3em] uppercase text-center"
                    >
                        Enter Hangar
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
