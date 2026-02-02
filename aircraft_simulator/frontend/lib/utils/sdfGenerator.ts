
import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

// Enable BVH raycasting on THREE.Mesh (optional but good practice if raycasting)
THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

export function generateSDFFromMesh(mesh: THREE.Object3D, size = 64) {
    // 1. Prepare geometry
    // If it's a group, we might need to merge or pick the main mesh.
    // For now, let's assume 'mesh' is a THREE.Mesh or we find the first mesh child.
    let targetMesh: THREE.Mesh | undefined;

    if (mesh instanceof THREE.Mesh) {
        targetMesh = mesh;
    } else {
        mesh.traverse((child) => {
            if (!targetMesh && child instanceof THREE.Mesh) {
                targetMesh = child;
            }
        });
    }

    if (!targetMesh) {
        console.warn("SDF Generator: No mesh found in object");
        return { texture: null, box: new THREE.Box3() };
    }

    const geometry = targetMesh.geometry.clone();
    // Apply world transform if needed? Usually we want local SDF, 
    // but particles interact in world space.
    // Simpler: The particle simulation assumes the object is at (0,0,0) or we transform particles to local.
    // Let's assume the mesh is canonical (centered).

    // Ensure BVH is built
    if (!geometry.boundsTree) {
        // @ts-ignore - geometry extension
        geometry.computeBoundsTree();
    }
    const bvh = geometry.boundsTree;

    // 2. Create 3D data
    const data = new Float32Array(size * size * size);
    const bbox = new THREE.Box3().setFromObject(targetMesh);

    // Expand box for margin
    const margin = 2.0;
    const sampleBox = bbox.clone().expandByScalar(margin);

    const sizeVec = new THREE.Vector3();
    sampleBox.getSize(sizeVec);

    // 3. Bake
    const point = new THREE.Vector3();
    const target = new THREE.Vector3();

    for (let k = 0; k < size; k++) {
        for (let j = 0; j < size; j++) {
            for (let i = 0; i < size; i++) {
                // Map grid (i,j,k) to world pos
                point.set(
                    THREE.MathUtils.mapLinear(i, 0, size - 1, sampleBox.min.x, sampleBox.max.x),
                    THREE.MathUtils.mapLinear(j, 0, size - 1, sampleBox.min.y, sampleBox.max.y),
                    THREE.MathUtils.mapLinear(k, 0, size - 1, sampleBox.min.z, sampleBox.max.z)
                );

                // Closest point distance
                // bvh.closestPointToPoint returns { point, distance }
                // We use the bvh directly
                // @ts-ignore
                const dist = bvh.closestPointToPoint(point, target).distance;

                // Sign? 
                // For valid mesh, we could check inside/outside.
                // Simple version: just unsigned distance for collision is often enough 
                // if we just want to push OUT. 
                // But SDF implies signed. 
                // Raycasting can determine inside/outside (odd/even intersections).
                // For now, assume Unsigned Distance Field (UDF) is sufficient for "avoidance".
                // If we need true signed, we raycast.

                const index = i + (j * size) + (k * size * size);
                data[index] = dist;
            }
        }
    }

    // 4. Create Texture
    const texture = new THREE.Data3DTexture(data, size, size, size);
    texture.format = THREE.RedFormat;
    texture.type = THREE.FloatType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;

    return { texture, box: sampleBox };
}
