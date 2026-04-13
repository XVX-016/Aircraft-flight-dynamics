"use client";

import * as THREE from "three";

/**
 * Ground reference grid at Y=0 (ground plane in Three.js / sea level).
 * Provides spatial reference for the chase and top-down camera views.
 */
export default function GroundGrid() {
    return (
        <group>
            <gridHelper
                args={[10000, 200, new THREE.Color(0xffffff), new THREE.Color(0xffffff)]}
                position={[0, 0, 0]}
            >
                <meshBasicMaterial
                    attach="material"
                    color="#ffffff"
                    opacity={0.04}
                    transparent
                    depthWrite={false}
                />
            </gridHelper>
            {/* Thin horizon line for side view reference */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[20000, 20000]} />
                <meshBasicMaterial
                    color="#0a1628"
                    opacity={0.3}
                    transparent
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
}
