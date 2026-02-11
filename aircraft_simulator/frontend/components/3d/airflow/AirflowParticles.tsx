"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 45_000;
const AB_PARTICLE_COUNT = 5_000;

export default function AirflowParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const abRef = useRef<THREE.InstancedMesh>(null);
  const [isSupersonic] = useState(false);

  // 1. MAIN AIRFLOW SYSTEM
  const { offsets, speeds, phases } = useMemo(() => {
    const off = new Float32Array(PARTICLE_COUNT * 3);
    const spd = new Float32Array(PARTICLE_COUNT);
    const phs = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2.0;
      const radius = Math.sqrt(Math.random()) * 8.0;

      const xBase = Math.random() * 80.0 - 40.0;
      const yBase = Math.cos(angle) * radius;
      const zBase = Math.sin(angle) * radius;

      off[i * 3 + 0] = xBase;
      off[i * 3 + 1] = Math.round(yBase / 0.4) * 0.4;
      off[i * 3 + 2] = Math.round(zBase / 0.4) * 0.4;

      spd[i] = 0.8 + Math.random() * 1.4;
      phs[i] = Math.random();
    }
    return { offsets: off, speeds: spd, phases: phs };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMach: { value: 0.8 },
  }), []);

  const flowMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: uniforms,
    vertexShader: `
      precision highp float;
      uniform float uTime;
      uniform float uMach;
      
      attribute vec3 aOffset;
      attribute float aSpeed;
      attribute float aPhase;
      
      varying vec2 vUv;
      varying float vAlpha;
      varying float vSpeed; 
      varying float vIntensity; 

      float getSDF(vec3 p) {
        vec3 pOff = p + vec3(0.0, 1.5, 0.0);
        float sx = pOff.x; 
        float noseTaper = smoothstep(30.0, 4.0, sx); 
        float body = length(pOff.yz) - (3.6 * noseTaper);
        body = max(body, abs(pOff.x) - 30.0); 

        vec3 pW = vec3(pOff.x, pOff.y, abs(pOff.z));
        float wings = max(abs(pW.y) - 0.2, max(-pW.x - pW.z * 0.8 - 6.0, pW.x + pW.z * 0.2 - 14.0));
        wings = max(wings, pW.z - 26.0);
        
        return min(body, wings);
      }

      void main() {
        vUv = uv;
        float flowRange = 80.0;
        float loopTime = uTime * aSpeed + aPhase * flowRange;
        float xFlow = 40.0 - mod(loopTime * 30.0, 80.0); 
        vec3 simPos = vec3(xFlow, aOffset.y, aOffset.z);

        float snapTrigger = exp(-pow(uMach - 1.0, 2.0) / 0.002);
        float shockDist = snapTrigger * 3.0;
        simPos.yz += normalize(simPos.yz + 0.0001) * shockDist;

        float edgeFade = smoothstep(40.0, 35.0, xFlow) * smoothstep(-40.0, -35.0, xFlow);
        float dist = getSDF(simPos);
        float margin = 3.5; 
        float influence = smoothstep(margin, -0.5, dist); 

        if (simPos.x < 0.0) {
            float suction = smoothstep(0.0, -15.0, simPos.x) * 0.4;
            simPos.yz *= (1.0 - suction * influence);
        }

        float e = 0.5;
        vec3 normal = normalize(vec3(
            getSDF(simPos + vec3(e,0.0,0.0)) - getSDF(simPos - vec3(e,0.0,0.0)),
            getSDF(simPos + vec3(0.0,e,0.0)) - getSDF(simPos - vec3(0.0,e,0.0)),
            getSDF(simPos + vec3(0.0,0.0,e)) - getSDF(simPos - vec3(0.0,0.0,e))
        ));

        simPos -= normal * influence * 1.2; 
        vec3 flowDir = vec3(-1.0, 0.0, 0.0);
        vec3 tangent = flowDir - dot(flowDir, normal) * normal;
        if (length(tangent) < 0.01) tangent = flowDir;
        tangent = normalize(tangent);
        
        vec3 velocity = mix(flowDir, tangent, influence);
        if (length(velocity) < 0.01) velocity = flowDir;

        float vortexGlow = 0.0;
        vec3 leftTip = vec3(8.0, -1.5, -24.0); 
        vec3 rightTip = vec3(8.0, -1.5, 24.0);
        if (simPos.x < 10.0) {
            float dLeft = length(simPos.yz - leftTip.yz);
            float dRight = length(simPos.yz - rightTip.yz);
            float vortexInf = smoothstep(6.0, 0.5, min(dLeft, dRight));
            if (vortexInf > 0.0) {
                float trailDist = abs(simPos.x - 8.0);
                float swirl = trailDist * 1.5 * vortexInf;
                float s = sin(swirl); float c = cos(swirl);
                vec2 center = (dLeft < dRight) ? leftTip.yz : rightTip.yz;
                vec2 rel = simPos.yz - center;
                simPos.yz = center + vec2(rel.x * c - rel.y * s, rel.x * s + rel.y * c);
                vortexGlow = vortexInf * (1.2 + sin(uTime * 10.0));
            }
        }

        vSpeed = length(velocity);
        vIntensity = vortexGlow + snapTrigger * 2.0; 

        vec3 v = normalize(velocity);
        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 r = cross(v, up);
        if (length(r) < 0.01) r = vec3(0.0, 0.0, 1.0);
        r = normalize(r);
        up = cross(r, v);
        mat3 rotMat = mat3(v, up, r);

        vec3 localPos = position;
        localPos.x *= 20.0 * vSpeed; 
        localPos.y *= 0.0015 / (0.3 + vSpeed); 
        
        float radialMask = smoothstep(12.0, 4.0, length(simPos.yz));
        float gap = smoothstep(0.5, 2.0, dist); 
        vAlpha = edgeFade * gap * radialMask;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(simPos + (rotMat * localPos), 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uMach;
      varying vec2 vUv;
      varying float vAlpha;
      varying float vSpeed;
      varying float vIntensity;

      void main() {
        float tip = pow(vUv.x, 40.0); 
        float snap = exp(-pow(uMach - 1.0, 2.0) / 0.002);
        
        vec3 baseCol = vec3(0.9, 0.9, 0.95);
        vec3 vortexCol = vec3(0.0, 0.7, 1.0);
        vec3 snapCol = vec3(1.0, 1.0, 1.2); 
        
        vec3 finalCol = mix(baseCol, vortexCol, min(vIntensity, 1.0) * 0.5);
        finalCol = mix(finalCol, snapCol, snap);

        float alpha = vAlpha * tip * (0.12 + vIntensity * 0.4 + snap * 0.6);
        gl_FragColor = vec4(finalCol, alpha);
      }
    `
  }), [uniforms]);

  // 2. AFTERBURNER SYSTEM
  const { abOffsets, abSpeeds } = useMemo(() => {
    const off = new Float32Array(AB_PARTICLE_COUNT * 3);
    const spd = new Float32Array(AB_PARTICLE_COUNT);
    for (let i = 0; i < AB_PARTICLE_COUNT; i++) {
      off[i * 3 + 0] = Math.random() * -15;
      off[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      off[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      spd[i] = 3.0 + Math.random() * 2.0;
    }
    return { abOffsets: off, abSpeeds: spd };
  }, []);

  const abMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: uniforms,
    vertexShader: `
        uniform float uTime;
        uniform float uMach;
        attribute vec3 aOffset;
        attribute float aSpeed;
        varying float vIntensity;

        void main() {
            float throttle = smoothstep(1.0, 1.2, uMach); 
            if (throttle < 0.01) {
                gl_Position = vec4(0.0);
                return;
            }
            float xFlow = 6.0 - mod(uTime * aSpeed * 30.0, 20.0);
            vec3 simPos = vec3(xFlow, aOffset.y, aOffset.z);
            float disk = sin(simPos.x * 4.0 + uTime * 20.0);
            float taper = smoothstep(6.0, -10.0, simPos.x);
            vIntensity = throttle * taper * (1.0 + disk * 0.5);
            vec3 localPos = position;
            localPos.x *= 4.0; 
            gl_Position = projectionMatrix * modelViewMatrix * vec4(simPos + localPos, 1.0);
        }
      `,
    fragmentShader: `
        varying float vIntensity;
        void main() {
            vec3 hotColor = vec3(0.2, 0.5, 1.0); 
            float alpha = vIntensity * (1.0 - length(gl_PointCoord - 0.5));
            gl_FragColor = vec4(hotColor, alpha * 0.6);
        }
      `
  }), [uniforms]);

  // 3. ANIMATION LOOP
  useFrame((state) => {
    const { clock, camera } = state;
    const t = clock.elapsedTime;

    const targetMach = isSupersonic ? 1.6 : 0.8;
    uniforms.uMach.value = THREE.MathUtils.lerp(uniforms.uMach.value, targetMach, 0.02);
    uniforms.uTime.value = t;

    const mach = uniforms.uMach.value;
    const shakeTrigger = THREE.MathUtils.smoothstep(mach, 0.9, 1.1) * (1.0 - THREE.MathUtils.smoothstep(mach, 1.2, 1.4));
    const intensity = shakeTrigger * 0.15;
    state.camera.position.x += Math.sin(t * 60.0) * intensity;
    state.camera.position.y += Math.cos(t * 55.0) * intensity;

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const cam = camera as THREE.PerspectiveCamera;
      const targetFOV = mach > 1.0 ? 58 : 50;
      cam.fov = THREE.MathUtils.lerp(cam.fov, targetFOV, 0.05);
      cam.updateProjectionMatrix();
    }
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[null as any, null as any, PARTICLE_COUNT]} frustumCulled={false}>
        <planeGeometry args={[1, 1]}>
          <instancedBufferAttribute attach="attributes-aOffset" args={[offsets, 3]} />
          <instancedBufferAttribute attach="attributes-aSpeed" args={[speeds, 1]} />
          <instancedBufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        </planeGeometry>
        <primitive object={flowMaterial} attach="material" />
      </instancedMesh>

      <instancedMesh ref={abRef} args={[null as any, null as any, AB_PARTICLE_COUNT]} frustumCulled={false}>
        <planeGeometry args={[1, 1]}>
          <instancedBufferAttribute attach="attributes-aOffset" args={[abOffsets, 3]} />
          <instancedBufferAttribute attach="attributes-aSpeed" args={[abSpeeds, 1]} />
        </planeGeometry>
        <primitive object={abMaterial} attach="material" />
      </instancedMesh>
    </group>
  );
}