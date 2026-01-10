import * as THREE from 'three';
import { World } from '../world/World';

export interface RaycastResult {
    position: THREE.Vector3;
    normal: THREE.Vector3;
    voxel: number;
}

export function raycast(world: World, start: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): RaycastResult | null {
    // Standard DDA Algorithm
    const dx = direction.x || 1e-7;
    const dy = direction.y || 1e-7;
    const dz = direction.z || 1e-7;

    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const stepZ = Math.sign(dz);

    let tMaxX = intBound(start.x, dx);
    let tMaxY = intBound(start.y, dy);
    let tMaxZ = intBound(start.z, dz);

    const tDeltaX = Math.abs(1 / dx);
    const tDeltaY = Math.abs(1 / dy);
    const tDeltaZ = Math.abs(1 / dz);

    let currX = Math.floor(start.x);
    let currY = Math.floor(start.y);
    let currZ = Math.floor(start.z);

    const faceNormal = new THREE.Vector3();

    for (let i = 0; i < 100; i++) {
        const voxel = world.getVoxel(currX, currY, currZ);
        if (voxel !== 0) {
            return {
                position: new THREE.Vector3(currX, currY, currZ),
                normal: faceNormal.clone(),
                voxel
            };
        }

        if (tMaxX < tMaxY) {
            if (tMaxX < tMaxZ) {
                if (tMaxX > maxDistance) break;
                currX += stepX;
                tMaxX += tDeltaX;
                faceNormal.set(-stepX, 0, 0);
            } else {
                if (tMaxZ > maxDistance) break;
                currZ += stepZ;
                tMaxZ += tDeltaZ;
                faceNormal.set(0, 0, -stepZ);
            }
        } else {
            if (tMaxY < tMaxZ) {
                if (tMaxY > maxDistance) break;
                currY += stepY;
                tMaxY += tDeltaY;
                faceNormal.set(0, -stepY, 0);
            } else {
                if (tMaxZ > maxDistance) break;
                currZ += stepZ;
                tMaxZ += tDeltaZ;
                faceNormal.set(0, 0, -stepZ);
            }
        }
    }

    return null;
}

function intBound(s: number, ds: number): number {
    if (ds < 0) {
        return intBound(-s, -ds);
    } else {
        s = ((s % 1) + 1) % 1;
        return (1 - s) / ds;
    }
}
