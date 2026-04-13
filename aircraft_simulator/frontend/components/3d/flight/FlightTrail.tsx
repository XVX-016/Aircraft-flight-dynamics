"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { FlightState } from "@/hooks/useFlightSim";

interface FlightTrailProps {
    history: FlightState[];
}

const MAX_POINTS = 2000;
const V_MIN = 20;
const V_MAX = 80;

/**
 * Helper to map airspeed (m/s) to a color.
 * Blue(0,0,1) → Cyan(0,1,1) → Green(0,1,0) → Yellow(1,1,0) → Red(1,0,0)
 */
function velocityToColor(v: number): THREE.Color {
    const t = Math.max(0, Math.min(1, (v - V_MIN) / (V_MAX - V_MIN)));
    const color = new THREE.Color();
    // Using HSL: 0.66 (Blue) down to 0 (Red)
    color.setHSL(0.66 * (1 - t), 1.0, 0.5);
    return color;
}

/**
 * Renders the flight path with velocity-mapped colors.
 * Uses LineSegments for per-vertex coloring.
 */
export default function FlightTrail({ history }: FlightTrailProps) {
    const geomRef = useRef<THREE.BufferGeometry>(null);

    // LineSegments requires 2 vertices per segment (start, end)
    // Each vertex has 3 floats for position and 3 floats for color
    const positionsRef = useRef<Float32Array>(new Float32Array(MAX_POINTS * 2 * 3));
    const colorsRef = useRef<Float32Array>(new Float32Array(MAX_POINTS * 2 * 3));

    useFrame(() => {
        if (!geomRef.current || history.length < 2) return;

        const h = history;
        const count = Math.min(h.length - 1, MAX_POINTS);
        const positions = positionsRef.current;
        const colors = colorsRef.current;

        let pi = 0;
        let ci = 0;

        // Iterate backwards from most recent, up to count segments
        for (let i = h.length - count - 1; i < h.length - 1; i++) {
            const a = h[i];
            const b = h[i + 1];

            const speed = Math.sqrt(a.u ** 2 + a.v ** 2 + a.w ** 2);
            const col = velocityToColor(speed);

            // Segment Start
            positions[pi++] = a.x;
            positions[pi++] = -a.z;
            positions[pi++] = -a.y;

            colors[ci++] = col.r;
            colors[ci++] = col.g;
            colors[ci++] = col.b;

            // Segment End
            positions[pi++] = b.x;
            positions[pi++] = -b.z;
            positions[pi++] = -b.y;

            colors[ci++] = col.r;
            colors[ci++] = col.g;
            colors[ci++] = col.b;
        }

        const posAttr = geomRef.current.getAttribute("position") as THREE.BufferAttribute;
        const colAttr = geomRef.current.getAttribute("color") as THREE.BufferAttribute;

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
        geomRef.current.setDrawRange(0, count * 2);
    });

    return (
        <lineSegments>
            <bufferGeometry ref={geomRef}>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positionsRef.current, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[colorsRef.current, 3]}
                />
            </bufferGeometry>
            <lineBasicMaterial vertexColors transparent opacity={0.6} />
        </lineSegments>
    );
}
