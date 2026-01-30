"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSim } from "@/lib/providers/SimProvider";

/**
 * ESTIMATE GHOST
 * Renders the estimated aircraft state as a semi-transparent ghost offset from truth.
 * 
 * Visual Design:
 * - Truth aircraft: Rendered elsewhere (solid, opaque)
 * - Estimate aircraft: Ghosted, offset by error vector
 * - Separation line: Connects truth CG to estimate CG
 * 
 * The ghost opacity and color shift indicates estimation confidence.
 */

interface EstimateGhostProps {
    // Estimated position (from EKF)
    estimatedPosition: { x: number; y: number; z: number };
    // Estimated quaternion
    estimatedOrientation: { w: number; x: number; y: number; z: number };
    // Truth position (from SimCore)
    truthPosition?: { x: number; y: number; z: number };
    // Scale factor for visualization
    errorScale?: number;
    // Whether to show separation line
    showSeparationLine?: boolean;
}

export default function EstimateGhost({
    estimatedPosition,
    estimatedOrientation,
    truthPosition,
    errorScale = 1,
    showSeparationLine = true
}: EstimateGhostProps) {
    const groupRef = useRef<THREE.Group>(null);

    // Ghost material — semi-transparent, red-tinted when diverging
    const ghostMaterial = useMemo(() => new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.4,
        wireframe: true,
        side: THREE.DoubleSide
    }), []);

    // Calculate error magnitude for visual feedback
    const errorMagnitude = useMemo(() => {
        if (!truthPosition) return 0;
        const dx = estimatedPosition.x - truthPosition.x;
        const dy = estimatedPosition.y - truthPosition.y;
        const dz = estimatedPosition.z - truthPosition.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }, [estimatedPosition, truthPosition]);

    // Update material based on error
    useFrame(() => {
        if (ghostMaterial) {
            // Color shift: green (small error) → red (large error)
            const t = Math.min(errorMagnitude / 50, 1); // Normalize to 50m max
            ghostMaterial.color.setHSL(0.33 - t * 0.33, 0.8, 0.5); // Green to Red
            ghostMaterial.opacity = 0.3 + t * 0.4;
        }

    });

    // Convert quaternion to Euler for Three.js rotation
    const rotation = useMemo(() => {
        const q = new THREE.Quaternion(
            estimatedOrientation.x,
            estimatedOrientation.y,
            estimatedOrientation.z,
            estimatedOrientation.w
        );
        const euler = new THREE.Euler().setFromQuaternion(q);
        return euler;
    }, [estimatedOrientation]);



    return (
        <group ref={groupRef}>
            {/* Ghost Aircraft (Simplified geometry for now) */}
            <group
                position={[estimatedPosition.x, estimatedPosition.y, estimatedPosition.z]}
                rotation={rotation}
            >
                {/* Fuselage */}
                <mesh material={ghostMaterial}>
                    <cylinderGeometry args={[0.5, 0.3, 8, 8]} />
                </mesh>

                {/* Wings */}
                <mesh material={ghostMaterial} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <boxGeometry args={[0.1, 10, 2]} />
                </mesh>

                {/* Tail */}
                <mesh material={ghostMaterial} position={[0, 0.5, -3.5]} rotation={[Math.PI / 2, 0, 0]}>
                    <boxGeometry args={[3, 0.1, 1]} />
                </mesh>

                {/* Error Label */}
                <group position={[0, 2, 0]}>
                    {/* Would be a text sprite in production */}
                </group>
            </group>

            {/* Separation Line (using drei Line would be cleaner, but using mesh for compatibility) */}
            {showSeparationLine && truthPosition && (
                <group>
                    {/* Visual indicator of error vector via simple mesh */}
                    <mesh position={[
                        (truthPosition.x + estimatedPosition.x) / 2,
                        (truthPosition.y + estimatedPosition.y) / 2,
                        (truthPosition.z + estimatedPosition.z) / 2
                    ]}>
                        <sphereGeometry args={[0.2, 8, 8]} />
                        <meshBasicMaterial color={0xffaa00} transparent opacity={0.6} />
                    </mesh>
                </group>
            )}
        </group>
    );
}

/**
 * Hook to get estimation error for UI display
 */
export function useEstimationError(
    truth: { x: number; y: number; z: number },
    estimate: { x: number; y: number; z: number }
): { magnitude: number; components: [number, number, number] } {
    return useMemo(() => {
        const dx = estimate.x - truth.x;
        const dy = estimate.y - truth.y;
        const dz = estimate.z - truth.z;
        const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return { magnitude, components: [dx, dy, dz] };
    }, [truth, estimate]);
}
