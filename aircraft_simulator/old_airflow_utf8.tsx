"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { generateSDFFromMesh } from "@/lib/utils/sdfGenerator";

const PARTICLE_COUNT = 40_000;

export default function AirflowParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [sdfData, setSdfData] = useState<{ texture: THREE.Data3DTexture | null, box: THREE.Box3 | null }>({ texture: null, box: null });

  // 1. GENERATE PROCEDURAL MESH & SDF (Mocking the "Any Body" load)
  useEffect(() => {
    // Compose a dummy fighter jet mesh to prove the system works dynamically
    const group = new THREE.Group();

    // Fuselage
    const bodyGeo = new THREE.ConeGeometry(1.0, 8.0, 32);
    bodyGeo.rotateZ(-Math.PI / 2); // Point along X
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial());
    body.position.set(-1.0, 0, 0); // Center bias
    group.add(body);

    // Wings (Delta)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2, 3);
    wingShape.lineTo(4, 3); // Trailing edge
    wingShape.lineTo(4, -3);
    wingShape.lineTo(2, -3);
    wingShape.lineTo(0, 0); // Close
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.2, bevelEnabled: false });
    wingGeo.rotateX(Math.PI / 2);
    wingGeo.rotateY(Math.PI / 2); // Flat on XZ
    wingGeo.translate(1.0, 0, 0);
    const wings = new THREE.Mesh(wingGeo, new THREE.MeshBasicMaterial());
    group.add(wings);

    // Fins
    const finGeo = new THREE.BoxGeometry(2, 1.5, 0.2);
    finGeo.translate(3.0, 0.75, 0); // Back and up
    const finL = new THREE.Mesh(finGeo, new THREE.MeshBasicMaterial()); // Single fin for now or mirrored?
    // Let's assume single vertical fin
    group.add(finL);

    // MERGING SKIPPED FOR V1: Using the Fuselage (Body) as the main collider for the "Any Body" proof.
    // This avoids needing complex BufferGeometry utils or deprecated classes.

    const result = generateSDFFromMesh(body, 64);
    setSdfData(result);

    // Cleanup?
    return () => {
      if (result.texture) result.texture.dispose();
    };
  }, []);

  const { offsets, speeds, phases } = useMemo(() => {
    const off = new Float32Array(PARTICLE_COUNT * 3);
    const spd = new Float32Array(PARTICLE_COUNT);
    const phs = new Float32Array(PARTICLE_COUNT);

    const gridSide = Math.floor(Math.sqrt(PARTICLE_COUNT));
    const spacing = 0.12; // TIGHTER SPACING FOR VISIBILITY

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i % gridSide;
      const iy = Math.floor(i / gridSide);

      const y = (ix - gridSide / 2) * spacing;
      const z = (iy - gridSide / 2) * spacing;

      off[i * 3 + 0] = Math.random() * 60 - 30;
      off[i * 3 + 1] = y + (Math.random() - 0.5) * 0.05;
      off[i * 3 + 2] = z + (Math.random() - 0.5) * 0.05;

      spd[i] = 1.0 + Math.random() * 0.5;
      phs[i] = Math.random();
    }
    return { offsets: off, speeds: spd, phases: phs };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMach: { value: 0.8 },
    uSDFTexture: { value: null as THREE.Data3DTexture | null },
    uBoxMin: { value: new THREE.Vector3(-15, -15, -15) },
    uBoxMax: { value: new THREE.Vector3(15, 15, 15) },
  }), []);

  // Update uniforms when SDF is ready
  useEffect(() => {
    if (sdfData.texture) {
      uniforms.uSDFTexture.value = sdfData.texture;
      uniforms.uBoxMin.value = sdfData.box?.min || new THREE.Vector3();
      uniforms.uBoxMax.value = sdfData.box?.max || new THREE.Vector3();
    }
  }, [sdfData, uniforms]);

  const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: uniforms,
    side: THREE.DoubleSide,
    vertexShader: `
            precision highp float;
            precision highp sampler3D;

            uniform float uTime;
            uniform float uMach;
            
            uniform sampler3D uSDFTexture;
            uniform vec3 uBoxMin;
            uniform vec3 uBoxMax;

            attribute vec3 aOffset;
            attribute float aSpeed;
            attribute float aPhase;

            varying float vSpeed;
            varying float vAlpha;
            varying float vShock;
            varying vec2 vUv;

            // Sample the SDF Texture
            float getSDF(vec3 p) {
                // Map world p to 0..1 uvw
                vec3 size = uBoxMax - uBoxMin;
                vec3 uvw = (p - uBoxMin) / size;
                
                // If outsde box, return safe distance
                if (any(lessThan(uvw, vec3(0.0))) || any(greaterThan(uvw, vec3(1.0)))) {
                    return 5.0; // Outside (safe)
                }
                
                return texture(uSDFTexture, uvw).r;
            }

            void main() {
                vUv = uv;
                
                // 1. POSITION (Right to Left)
                // Cycle from +30 to -30
                float loopTime = uTime * aSpeed + aPhase * 20.0;
                float xFlow = 30.0 - mod(aOffset.x + loopTime * 15.0, 60.0);
                vec3 simPos = vec3(xFlow, aOffset.y, aOffset.z);

                // 2.AGRESSIVE SDF COLLISION
                float dist = getSDF(simPos);
                
                // Smooth influence with larger margin
                float margin = 3.0;
                float airInfluence = smoothstep(margin, 0.0, dist); 
                
                // Gradient (Normal)
                float e = 0.1;
                vec3 normal = normalize(vec3(
                    getSDF(simPos + vec3(e, 0, 0)) - getSDF(simPos - vec3(e, 0, 0)),
                    getSDF(simPos + vec3(0, e, 0)) - getSDF(simPos - vec3(0, e, 0)),
                    getSDF(simPos + vec3(0, 0, e)) - getSDF(simPos - vec3(0, 0, e))
                ));

                // Laminar Flow (Right to Left is -X)
                vec3 flowDir = vec3(-1.0, 0.0, 0.0);
                vec3 tangent = normalize(flowDir - dot(flowDir, normal) * normal);
                
                vec3 velocity = mix(flowDir, tangent, airInfluence);
                
                // Push out (Bow Wave effect)
                simPos += normal * airInfluence * 2.0;

                // 3. VORTEX PERSISTENCE
                float wingSpan = 6.0; 
                float wingEdgeX = 2.0; 

                // Flow is Right->Left, so downstream is < wingEdgeX
                if (simPos.x < wingEdgeX) {
                    float trailDist = abs(simPos.x - wingEdgeX);
                    vec3 tipPos = vec3(wingEdgeX, 0.0, sign(simPos.z) * wingSpan);
                    
                    float spiralStrength = 3.5 / (1.0 + trailDist * 0.1);
                    float expansion = 0.15 * trailDist;

                    float distToCore = length(simPos.yz - tipPos.yz);
                    
                    if (distToCore < (0.5 + expansion)) {
                        float angle = trailDist * spiralStrength * sign(simPos.z);
                        float s = sin(angle); 
                        float c = cos(angle);
                        
                        vec2 relPos = simPos.yz - tipPos.yz;
                        vec2 rotatedPos;
                        rotatedPos.x = relPos.x * c - relPos.y * s;
                        rotatedPos.y = relPos.x * s + relPos.y * c;
                        
                        simPos.yz = tipPos.yz + rotatedPos;
                        
                        // Spin velocity
                        velocity = normalize(velocity + vec3(0.0, -s, c) * 0.5);
                    }
                }

                // 4. MACH SHOCK (Rough Approx for Generic)
                vShock = 0.0;
                if (uMach > 1.0) {
                     float machAngle = asin(1.0 / uMach);
                     // Cone faces +X (source)
                     float coneRad = (5.0 - simPos.x) * tan(machAngle); 
                     if (abs(length(simPos.yz) - coneRad) < 0.5) {
                         vShock = (uMach - 1.0);
                     }
                }
                
                // 5. CINEMATIC STREAKS
                vSpeed = length(velocity) + vShock * 2.0;
                float streakLen = 15.0 * vSpeed; // Slightly reduced for density
                vec3 localPos = position;
                localPos.x *= streakLen;
                localPos.y *= 0.015; // THICKER LINES for visibility

                vec3 v = normalize(velocity);
                vec3 u = vec3(0, 1, 0);
                vec3 r = normalize(cross(v, u));
                u = cross(r, v);
                mat3 rotMat = mat3(v, u, r);

                vec3 finalVert = simPos + (rotMat * localPos);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(finalVert, 1.0);
                
                // Alpha
                vAlpha = (1.0 - smoothstep(20.0, 30.0, abs(simPos.x))); // Wider fade
                vAlpha *= smoothstep(0.0, 0.2, dist); 
            }
        `,
    fragmentShader: `
            varying float vSpeed;
            varying float vAlpha;
            varying float vShock;
            varying vec2 vUv;

            void main() {
                // Sharp Head
                float head = pow(vUv.x, 5.0); // Softer head
                
                // BOOST VISIBILITY
                vec3 smokeCol = vec3(1.0, 1.0, 1.0);
                
                // HIGH ALPHA for debugging/visibility
                float alpha = vAlpha * head * 0.4; // Was 0.07, now 0.4
                
                if (vShock > 0.1) {
                    alpha += vShock * 0.4;
                    smokeCol = vec3(1.0, 0.9, 0.8); // Heat tint
                }
                
                gl_FragColor = vec4(smokeCol, alpha);
            }
        `
  }), [uniforms]);

  useFrame((state) => {
    if (meshRef.current) {
      uniforms.uTime.value = state.clock.elapsedTime;
      uniforms.uMach.value = 1.1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} frustumCulled={false}>
      <planeGeometry args={[1, 1]}>
        <instancedBufferAttribute attach="attributes-aOffset" args={[offsets, 3]} />
        <instancedBufferAttribute attach="attributes-aSpeed" args={[speeds, 1]} />
        <instancedBufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </planeGeometry>
      <primitive object={shaderMaterial} attach="material" />
    </instancedMesh>
  );
}
