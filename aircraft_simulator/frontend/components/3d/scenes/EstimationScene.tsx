"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSim } from "@/lib/providers/SimProvider";
import EstimateGhost from "../estimation/EstimateGhost";
import CovarianceEllipsoid from "../estimation/CovarianceVisuals";
import { useSimulationStore } from "@/stores/useSimulationStore";

/**
 * ESTIMATION SCENE
 * Visualizes the EKF state estimate vs truth in 3D.
 * 
 * Shows:
 * - Truth aircraft (solid)
 * - Estimated aircraft (ghost)
 * - Position uncertainty ellipsoid
 * - Error vector connecting them
 */

interface EstimationSceneProps {
    // From EKF (passed from parent or hook)
    estimatedPosition?: { x: number; y: number; z: number };
    estimatedOrientation?: { w: number; x: number; y: number; z: number };
    positionCovariance?: number[][];
    showGhost?: boolean;
    showEllipsoid?: boolean;
}

export default function EstimationScene({
    estimatedPosition = { x: 0, y: 0, z: 0 },
    estimatedOrientation = { w: 1, x: 0, y: 0, z: 0 },
    positionCovariance = [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    showGhost = true,
    showEllipsoid = true
}: EstimationSceneProps) {
    const { truthState } = useSim();
    const estimationData = useSimulationStore((state) => ({
        estState: state.estimatedState,
        cov: state.covariance
    }));

    // Prefer Store data (Bridge from Validation Lab), fallback to Props, then Defaults
    const estPos = estimationData.estState?.position ?? estimatedPosition;
    // const estRot = estimationData.estState?.rotation ?? estimatedOrientation; // Not used yet for ghost orientation if not passed?

    // Covariance Slicing: Ensure we have 3x3 for Position
    // If 9x9 (P), take top-left 3x3. 
    const activeCov = estimationData.cov
        ? (estimationData.cov.length > 3
            ? estimationData.cov.slice(0, 3).map(row => row.slice(0, 3))
            : estimationData.cov)
        : positionCovariance;

    // Default position if no truth state available
    const truthPos = truthState ? {
        x: truthState.p.x,
        y: truthState.p.y,
        z: truthState.p.z
    } : { x: 0, y: 0, z: 0 };

    return (
        <group>
            {/* Truth Aircraft (Solid) */}
            <group position={[truthPos.x, truthPos.y, truthPos.z]}>
                {/* Simple aircraft shape for truth */}
                <mesh>
                    <cylinderGeometry args={[0.5, 0.3, 8, 8]} />
                    <meshStandardMaterial color="#4ade80" metalness={0.3} roughness={0.7} />
                </mesh>
                {/* Wings */}
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <boxGeometry args={[0.1, 10, 2]} />
                    <meshStandardMaterial color="#4ade80" metalness={0.3} roughness={0.7} />
                </mesh>
                {/* Tail */}
                <mesh position={[0, 0.5, -3.5]} rotation={[Math.PI / 2, 0, 0]}>
                    <boxGeometry args={[3, 0.1, 1]} />
                    <meshStandardMaterial color="#4ade80" metalness={0.3} roughness={0.7} />
                </mesh>
            </group>

            {/* Estimated Aircraft (Ghost) */}
            {showGhost && (
                <EstimateGhost
                    estimatedPosition={estPos}
                    estimatedOrientation={estimatedOrientation} // TODO: Add orientation to store bridge
                    truthPosition={truthPos}
                    showSeparationLine={true}
                />
            )}

            {/* Position Covariance Ellipsoid */}
            {showEllipsoid && activeCov && (
                <CovarianceEllipsoid
                    position={estPos}
                    covariance={activeCov}
                    confidence={2}
                />
            )}

            {/* Ground reference */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -50, 0]} receiveShadow>
                <planeGeometry args={[500, 500]} />
                <meshStandardMaterial color="#1e293b" transparent opacity={0.5} />
            </mesh>

            {/* Axis guides for orientation */}
            <axesHelper args={[10]} position={[truthPos.x, truthPos.y, truthPos.z]} />
        </group>
    );
}
