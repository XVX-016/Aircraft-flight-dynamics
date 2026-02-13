"use client";

import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Environment } from "@react-three/drei";
import HomepageTakeoff from "@/components/3d/scenes/HomepageTakeoff";
import PerformanceController from "@/components/3d/PerformanceController";

const HeroSection = () => {
    return (
        <section className="relative h-screen w-full overflow-hidden flex flex-col items-center justify-center bg-black">
            {/* 3D Background - Scoped to Hero */}
            <div className="absolute inset-0">
                <Canvas
                    dpr={[1, 2]}
                    gl={{
                        antialias: true,
                        powerPreference: "high-performance",
                        alpha: false,
                    }}
                    camera={{ position: [5, 2, 8], fov: 50, near: 0.1, far: 5000 }}
                    shadows
                >
                    <color attach="background" args={["#020617"]} />
                    <Suspense fallback={null}>
                        <Environment preset="city" background={false} />
                        <ambientLight intensity={0.4} />
                        <directionalLight
                            position={[5, 10, 5]}
                            intensity={1.2}
                            castShadow
                            shadow-mapSize={[2048, 2048]}
                        />
                        <PerformanceController />
                        <HomepageTakeoff />
                    </Suspense>
                </Canvas>
            </div>

            {/* Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />

            {/* Gradient Fade at bottom to blend with next section */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-b from-transparent to-black z-10 pointer-events-none" />

            {/* Main Content */}
            <div className="relative z-20 text-center max-w-[1400px] mx-auto px-8 h-full flex flex-col justify-center">
                <div className="mb-8 relative">
                    <h1
                        className="text-[clamp(4rem,15vw,12rem)] font-black leading-[0.8] tracking-tighter text-white opacity-0 animate-fade-in-up"
                        style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
                    >
                        Precision
                        <br />
                        Flight
                    </h1>

                    <h2
                        className="text-[clamp(2rem,6vw,5rem)] font-bold tracking-tight mt-2 opacity-0 animate-fade-in-up text-stroke"
                        style={{
                            animationDelay: '0.6s',
                            animationFillMode: 'forwards',
                        }}
                    >
                        Dynamics & Control
                    </h2>
                </div>

                {/* Subtitle */}
                <p
                    className="text-[10px] md:text-xs text-white/40 tracking-[0.3em] uppercase mb-12 max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up"
                    style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}
                >
                    Advanced attitude determination and control simulation platform
                </p>

                {/* CTA Button */}
                <div className="flex flex-col items-center gap-12 opacity-0 animate-scale-in" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
                    <Link
                        href="/flight-lab"
                        className="px-12 py-4 border border-white/20 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-300 text-xs font-mono tracking-[0.3em] uppercase"
                    >
                        Launch Pilot Deck
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
