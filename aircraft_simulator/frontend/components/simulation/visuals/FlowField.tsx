"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { simulationEngine } from "@/lib/simulation/simulation-engine";

const PARTICLE_COUNT = 2000;
const BOUNDS = { x: 40, y: 20, z: 20 }; // Emitter box size

const vertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uAlpha;
  uniform float uBeta;
  
  attribute float aOffset;
  attribute vec3 aRandom;
  
  varying float vOpacity;
  
  void main() {
    // Basic position cycling
    vec3 pos = position;
    
    // Move along X axis (Airflow is -X in body frame)
    // Speed * Time + Offset
    float zPos = mod(pos.z + (uTime * uSpeed * 5.0) + aRandom.z * 10.0, 40.0) - 20.0;
    // Actually we want particles to flow backward. 
    // If Aircraft is static in view, wind moves -X (Body Forward is +X)
    // Let's assume standard Body Frame: +X is Forward. Wind comes from +X relative to ground, so moves -X relative to body.
    
    float xFlow = -mod((uTime * uSpeed * 2.0) + aOffset, 60.0) + 30.0;
    
    // Apply AoA (Alpha) and Beta deviations
    // Alpha rotates flow around Y axis (Pitch)
    // Beta rotates flow around Z axis (Yaw)
    
    // Simple linearized deflection
    // If Alpha > 0 (Pitch Up), wind seems to come from below relative to chord? 
    // No, if Plane Pitches Up (Alpha positive), Relative Wind hits belly.
    // So Visual Wind Vector should rotate UP relative to camera?
    // Wait. Alpha = angle between chord and velocity vector.
    // If we view from Aircraft Frame: 
    // Velocity Vector comes from -Alpha angle.
    // So particles should move along vector that is Rotated by Alpha.
    
    float yDev = xFlow * tan(uAlpha); 
    float zDev = xFlow * tan(uBeta);
    
    vec3 flowPos = vec3(xFlow, pos.y + yDev, pos.z + zDev);
    
    // Random spread applied around the streamline
    flowPos += aRandom;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(flowPos, 1.0);
    gl_PointSize = (1.0 - (flowPos.x + 30.0) / 60.0) * 4.0; // Fade size
    
    // Opacity fade at edges
    float dist = abs(xFlow) / 30.0;
    vOpacity = 1.0 - smoothstep(0.7, 1.0, dist);
  }
`;

const fragmentShader = `
  varying float vOpacity;
  
  void main() {
    if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.5) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, vOpacity * 0.5);
  }
`;

export default function FlowField() {
    const meshRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    // Generate static attributes
    const { positions, randoms, offsets } = useMemo(() => {
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const randoms = new Float32Array(PARTICLE_COUNT * 3);
        const offsets = new Float32Array(PARTICLE_COUNT);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Initial distribution box
            positions[i * 3] = (Math.random() - 0.5) * 60; // Spread along X significantly
            positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

            randoms[i * 3] = (Math.random() - 0.5) * 5; // Random flicker/offset
            randoms[i * 3 + 1] = (Math.random() - 0.5) * 5;
            randoms[i * 3 + 2] = (Math.random() - 0.5) * 5;

            offsets[i] = Math.random() * 100;
        }

        return { positions, randoms, offsets };
    }, []);

    useFrame((state) => {
        if (!materialRef.current) return;

        // Get simulation state
        const truth = simulationEngine.getRenderState(state.clock.elapsedTime); // Use engine buffer
        const Va = Math.sqrt(truth.v.x ** 2 + truth.v.y ** 2 + truth.v.z ** 2); // True Airspeed

        materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        materialRef.current.uniforms.uSpeed.value = Math.max(Va, 10.0); // Min speed for visual flow even if stopped
        materialRef.current.uniforms.uAlpha.value = truth.alpha || 0;
        materialRef.current.uniforms.uBeta.value = truth.beta || 0;
    });

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={PARTICLE_COUNT}
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-aRandom"
                    count={PARTICLE_COUNT}
                    args={[randoms, 3]}
                />
                <bufferAttribute
                    attach="attributes-aOffset"
                    count={PARTICLE_COUNT}
                    args={[offsets, 1]}
                />
            </bufferGeometry>
            <shaderMaterial
                ref={materialRef}
                transparent
                depthWrite={false}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={{
                    uTime: { value: 0 },
                    uSpeed: { value: 0 },
                    uAlpha: { value: 0 },
                    uBeta: { value: 0 }
                }}
            />
        </points>
    );
}
