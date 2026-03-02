"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { generateSDFFromMesh } from "@/lib/utils/sdfGenerator";

const PARTICLE_COUNT = 12000;

export default function AirflowParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [sdfData, setSdfData] = useState<{ texture: THREE.Data3DTexture | null, box: THREE.Box3 | null }>({ texture: null, box: null });

  useEffect(() => {
    const group = new THREE.Group();

    const bodyGeo = new THREE.ConeGeometry(1.0, 8.0, 32);
    bodyGeo.rotateZ(-Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial());
    body.position.set(-1.0, 0, 0);
    group.add(body);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2, 3);
    wingShape.lineTo(4, 3);
    wingShape.lineTo(4, -3);
    wingShape.lineTo(2, -3);
    wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.2, bevelEnabled: false });
    wingGeo.rotateX(Math.PI / 2);
    wingGeo.rotateY(Math.PI / 2);
    wingGeo.translate(1.0, 0, 0);
    const wings = new THREE.Mesh(wingGeo, new THREE.MeshBasicMaterial());
    group.add(wings);

    const finGeo = new THREE.BoxGeometry(2, 1.5, 0.2);
    finGeo.translate(3.0, 0.75, 0);
    const finL = new THREE.Mesh(finGeo, new THREE.MeshBasicMaterial());
    group.add(finL);

    const result = generateSDFFromMesh(body, 64);
    setSdfData(result);

    return () => {
      if (result.texture) result.texture.dispose();
    };
  }, []);

  const { offsets, speeds, phases } = useMemo(() => {
    const off = new Float32Array(PARTICLE_COUNT * 3);
    const spd = new Float32Array(PARTICLE_COUNT);
    const phs = new Float32Array(PARTICLE_COUNT);

    const gridSide = Math.floor(Math.sqrt(PARTICLE_COUNT));
    const spacing = 0.12;

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

            float getSDF(vec3 p) {
                vec3 size = max(uBoxMax - uBoxMin, vec3(0.001));
                vec3 uvw = (p - uBoxMin) / size;
                if (any(lessThan(uvw, vec3(0.0))) || any(greaterThan(uvw, vec3(1.0)))) {
                    return 5.0;
                }
                return texture(uSDFTexture, uvw).r;
            }

            void main() {
                vUv = uv;
                
                float loopTime = uTime * aSpeed + aPhase * 20.0;
                float xFlow = 30.0 - mod(aOffset.x + loopTime * 15.0, 60.0);
                vec3 simPos = vec3(xFlow, aOffset.y, aOffset.z);

                float dist = getSDF(simPos);
                float margin = 3.0;
                float airInfluence = smoothstep(margin, 0.0, dist); 
                
                float e = 0.1;
                vec3 normal = normalize(vec3(
                    getSDF(simPos + vec3(e, 0, 0)) - getSDF(simPos - vec3(e, 0, 0)),
                    getSDF(simPos + vec3(0, e, 0)) - getSDF(simPos - vec3(0, e, 0)),
                    getSDF(simPos + vec3(0, 0, e)) - getSDF(simPos - vec3(0, 0, e))
                ));

                vec3 flowDir = vec3(-1.0, 0.0, 0.0);
                vec3 tangent = normalize(flowDir - dot(flowDir, normal) * normal);
                
                vec3 velocity = mix(flowDir, tangent, airInfluence);
                
                simPos += normal * airInfluence * 2.0;

                float wingSpan = 6.0; 
                float wingEdgeX = 2.0; 

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
                        
                        velocity = normalize(velocity + vec3(0.0, -s, c) * 0.5);
                    }
                }

                vShock = 0.0;
                if (uMach > 1.0) {
                     float machAngle = asin(1.0 / uMach);
                     float coneRad = (5.0 - simPos.x) * tan(machAngle); 
                     if (abs(length(simPos.yz) - coneRad) < 0.5) {
                         vShock = (uMach - 1.0);
                     }
                }
                
                vSpeed = length(velocity) + vShock * 2.0;
                float streakLen = 15.0 * vSpeed;
                vec3 localPos = position;
                localPos.x *= streakLen;
                localPos.y *= 0.015;

                vec3 v = normalize(velocity);
                vec3 u = vec3(0, 1, 0);
                vec3 r = normalize(cross(v, u));
                u = cross(r, v);
                mat3 rotMat = mat3(v, u, r);

                vec3 finalVert = simPos + (rotMat * localPos);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(finalVert, 1.0);
                
                vAlpha = (1.0 - smoothstep(20.0, 30.0, abs(simPos.x)));
                vAlpha *= smoothstep(0.0, 0.2, dist); 
            }
        `,
    fragmentShader: `
            varying float vSpeed;
            varying float vAlpha;
            varying float vShock;
            varying vec2 vUv;

            void main() {
                float head = pow(vUv.x, 5.0);
                vec3 smokeCol = vec3(1.0, 1.0, 1.0);
                float alpha = vAlpha * head * 0.4;
                
                if (vShock > 0.1) {
                    alpha += vShock * 0.4;
                    smokeCol = vec3(1.0, 0.9, 0.8);
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
