"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * COVARIANCE ELLIPSOID
 * Visualizes position uncertainty as a 3D ellipsoid.
 * 
 * Math: Position covariance P_pos (3x3) is eigend-decomposed:
 *   P = Q Λ Q^T
 * Ellipsoid axes = k * sqrt(λ_i) where k ≈ 2 for 95% confidence.
 */

interface CovarianceEllipsoidProps {
    position: { x: number; y: number; z: number };
    covariance: number[][]; // 3x3 position covariance matrix
    confidence?: number; // 1-3 sigma (default 2 = 95%)
}

export default function CovarianceEllipsoid({
    position,
    covariance,
    confidence = 2
}: CovarianceEllipsoidProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    // Compute ellipsoid axes from covariance eigenvalues
    const { scale, rotation } = useMemo(() => {
        // Simplified: assume diagonal covariance for now
        // Full implementation would need eigenvalue decomposition
        const sigmaX = Math.sqrt(Math.max(covariance[0]?.[0] ?? 1, 0.01)) * confidence;
        const sigmaY = Math.sqrt(Math.max(covariance[1]?.[1] ?? 1, 0.01)) * confidence;
        const sigmaZ = Math.sqrt(Math.max(covariance[2]?.[2] ?? 1, 0.01)) * confidence;

        return {
            scale: new THREE.Vector3(sigmaX, sigmaY, sigmaZ),
            rotation: new THREE.Euler(0, 0, 0) // Would come from eigenvectors
        };
    }, [covariance, confidence]);

    // Material with opacity based on uncertainty magnitude
    const material = useMemo(() => {
        const avgSigma = (scale.x + scale.y + scale.z) / 3;
        const opacity = Math.min(0.1 + avgSigma / 50, 0.4);

        return new THREE.MeshBasicMaterial({
            color: 0x3b82f6, // Blue
            transparent: true,
            opacity,
            wireframe: false,
            side: THREE.DoubleSide,
            depthWrite: false
        });
    }, [scale]);

    return (
        <mesh
            ref={meshRef}
            position={[position.x, position.y, position.z]}
            scale={[scale.x, scale.y, scale.z]}
            rotation={rotation}
        >
            <sphereGeometry args={[1, 16, 16]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
}

/**
 * ORIENTATION CONE
 * Visualizes attitude uncertainty as cones around body axes.
 */
interface OrientationConeProps {
    position: { x: number; y: number; z: number };
    orientation: { w: number; x: number; y: number; z: number };
    attitudeCovariance: number[][]; // 3x3 attitude covariance (roll, pitch, yaw)
    axis: 'roll' | 'pitch' | 'yaw';
}

export function OrientationCone({
    position,
    orientation,
    attitudeCovariance,
    axis
}: OrientationConeProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    const { height, radius, color, localRotation } = useMemo(() => {
        const axisIndex = axis === 'roll' ? 0 : axis === 'pitch' ? 1 : 2;
        const sigma = Math.sqrt(Math.max(attitudeCovariance[axisIndex]?.[axisIndex] ?? 0.01, 0.001));

        // Cone angle proportional to sigma
        const coneAngle = sigma * 2; // radians
        const h = 5;
        const r = h * Math.tan(coneAngle);

        // Rotation to align cone with axis
        const rot = new THREE.Euler();
        if (axis === 'roll') rot.set(0, 0, -Math.PI / 2);
        else if (axis === 'pitch') rot.set(Math.PI / 2, 0, 0);
        // yaw: default cone orientation works

        const col = axis === 'roll' ? 0xef4444 : axis === 'pitch' ? 0x22c55e : 0x3b82f6;

        return { height: h, radius: r, color: col, localRotation: rot };
    }, [attitudeCovariance, axis]);

    // Apply body orientation
    const worldRotation = useMemo(() => {
        const q = new THREE.Quaternion(
            orientation.x,
            orientation.y,
            orientation.z,
            orientation.w
        );
        const euler = new THREE.Euler().setFromQuaternion(q);
        euler.x += localRotation.x;
        euler.y += localRotation.y;
        euler.z += localRotation.z;
        return euler;
    }, [orientation, localRotation]);

    return (
        <mesh
            ref={meshRef}
            position={[position.x, position.y, position.z]}
            rotation={worldRotation}
        >
            <coneGeometry args={[radius, height, 16, 1, true]} />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={0.25}
                side={THREE.DoubleSide}
                wireframe
            />
        </mesh>
    );
}
