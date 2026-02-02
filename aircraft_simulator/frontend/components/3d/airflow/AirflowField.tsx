"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { useSim } from "@/lib/providers/SimProvider";

// GLSL Shaders for surface airflow visualization
const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform float time;
    uniform float airflowIntensity;
    uniform float aoa; // Angle of Attack in degrees
    uniform vec3 flowDirection; // Direction of airflow
    
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    // Simple pseudo-noise
    float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
        // Calculate flow alignment (dot product of normal and flow vector)
        // Flow comes FROM the direction, so we align with -flowDirection?
        // Actually, usually we test alignment with the flow stream.
        // If flow is along X+, vector is (1,0,0).
        
        float alignment = dot(vNormal, flowDirection);
        
        // Separation logic: high AoA or low alignment causes "turbulence"
        float stallThreshold = 15.0; // degrees
        float isStalling = smoothstep(stallThreshold - 5.0, stallThreshold + 5.0, abs(aoa));
        
        // Moving "streak" pattern along the flow direction
        // We use dot product to project world pos onto flow axis
        float posOnAxis = dot(vWorldPos, flowDirection);
        float flow = fract(posOnAxis * 0.5 - time * (2.0 + airflowIntensity));
        
        float streak = smoothstep(0.45, 0.5, flow) * smoothstep(0.55, 0.5, flow);
        
        // Color mapping: Blue (laminar) to Red (separated/stall)
        vec3 laminarColor = vec3(0.1, 0.4, 1.0);
        vec3 stallColor = vec3(1.0, 0.2, 0.1);
        
        vec3 finalColor = mix(laminarColor, stallColor, isStalling);
        
        // Intensity modulation
        float alpha = streak * (0.3 + isStalling * 0.4) * airflowIntensity;
        
        // Add some noise to stalling regions
        if (isStalling > 0.1) {
            float n = noise(vUv * 10.0 + time * 5.0);
            alpha *= (1.0 + n * isStalling);
        }

        gl_FragColor = vec4(finalColor, alpha);
    }
`;

interface AirflowFieldProps {
    direction?: [number, number, number];
    visibleStatic?: boolean;
}

export default function AirflowField({ direction = [0, 0, 1], visibleStatic = false }: AirflowFieldProps) {
    const { qualityTier } = useSimulationStore();
    const { derived } = useSim();
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const segments = qualityTier === 'high' ? 64 : qualityTier === 'mid' ? 32 : 16;

    // Get flow data from derived physics
    const airspeed = derived?.airspeed ?? 0;
    const aoa = derived?.aoa ?? 0;

    const uniforms = useMemo(() => ({
        time: { value: 0 },
        airflowIntensity: { value: 1.0 },
        aoa: { value: 0 },
        flowDirection: { value: new THREE.Vector3(...direction) }
    }), [direction]); // Re-create if direction prop changes

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value += delta;

            let intensity = Math.min(airspeed / 200, 1.5);
            // Ensure minimum visibility if static mode is enabled
            if (visibleStatic && intensity < 0.4) {
                intensity = 0.4;
            }

            materialRef.current.uniforms.airflowIntensity.value = intensity;
            materialRef.current.uniforms.aoa.value = aoa * (180 / Math.PI);
            // Ensure uniform is up to date (though useMemo handles init, dynamic updates to prop need this?)
            // If direction changes infrequently, useMemo is enough, but accessing .value is safer
            materialRef.current.uniforms.flowDirection.value.set(...direction);
        }
    });

    return (
        <mesh>
            <sphereGeometry args={[8, segments, segments]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                transparent
                depthWrite={false}
                uniforms={uniforms}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

