"use client";

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
    in vec3 position;

    uniform mat3 eigVecs;      // eigenvectors as columns
    uniform vec3 eigVals;      // sqrt(eigenvalues)
    uniform mat4 modelMatrix;
    uniform mat4 viewMatrix;
    uniform mat4 projectionMatrix;

    out vec3 vLocal;

    void main() {
        // Construct local model matrix manually for the ellipsoid scaling/rotation
        // "modelMatrix" coming from THREE usually handles position/scale of the mesh container
        // But we want to deform the sphere based on Eigen decomposition
        
        vec3 scaled = position * eigVals;
        vec3 world  = eigVecs * scaled;
        
        // Pass "local" deformed position for fragment shader alignment check
        vLocal = world; 

        // Apply standard transforms
        // modelMatrix here applies the "center" position of the mesh
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(world, 1.0);
    }
`;

const fragmentShader = `
    in vec3 vLocal;

    uniform vec3 weakestDir;   // normalized eigenvector
    uniform float neesRatio;   // NEES / chi-square bound

    void main() {
        float align = abs(dot(normalize(vLocal), weakestDir));
        
        // glow only when inconsistent (or approaching)
        // smoothstep(0.7, 1.0, align) constrains glow to the tips
        float glow = smoothstep(0.7, 1.0, align) * max(0.0, neesRatio - 0.8) * 2.0;

        vec3 baseColor = mix(
            vec3(0.2, 0.8, 0.2),   // green
            vec3(0.9, 0.2, 0.2),   // red
            clamp(neesRatio - 0.8, 0.0, 1.0)
        );

        vec3 finalColor = baseColor + glow * vec3(1.0, 0.4, 0.1);
        float alpha = 0.35 + glow * 0.4;

        gl_FragColor = vec4(finalColor, alpha);
    }
`;

interface CovarianceEllipsoidProps {
    eigenVectors: number[][]; // 3x3
    eigenValues: number[];    // 3
    weakestDirection: number[]; // 3
    nees: number;
    neesBound: number;
}

export default function CovarianceEllipsoid({ eigenVectors, eigenValues, weakestDirection, nees, neesBound }: CovarianceEllipsoidProps) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(() => ({
        eigVecs: { value: new THREE.Matrix3() },
        eigVals: { value: new THREE.Vector3() },
        weakestDir: { value: new THREE.Vector3() },
        neesRatio: { value: 0 }
    }), []);

    useFrame(() => {
        if (!materialRef.current) return;

        // Update uniforms
        const eVecs = new THREE.Matrix3();
        // Flatten 3x3 array to column-major for ThreeJS/GLSL?
        // THREE.Matrix3.set() takes row-major: n11, n12, n13...
        // Input is row-major array of arrays likely.
        eVecs.set(
            eigenVectors[0][0], eigenVectors[0][1], eigenVectors[0][2],
            eigenVectors[1][0], eigenVectors[1][1], eigenVectors[1][2],
            eigenVectors[2][0], eigenVectors[2][1], eigenVectors[2][2]
        );

        materialRef.current.uniforms.eigVecs.value = eVecs;
        materialRef.current.uniforms.eigVals.value.set(...eigenValues);
        // Normalize weakest direction just in case
        const wDir = new THREE.Vector3(...weakestDirection).normalize();
        materialRef.current.uniforms.weakestDir.value = wDir;
        materialRef.current.uniforms.neesRatio.value = nees / neesBound;
    });

    return (
        <mesh>
            <sphereGeometry args={[1, 32, 32]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                transparent
                depthWrite={false}
                uniforms={uniforms}
                glslVersion={THREE.GLSL3}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}
