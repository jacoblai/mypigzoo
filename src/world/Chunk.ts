import * as THREE from 'three';
import { MeshBuilder } from './MeshBuilder';
import { TextureManager } from '../core/TextureManager';

export class Chunk {
    public static readonly SIZE = 16;
    public data: Uint8Array;
    public mesh: THREE.Mesh;
    public position: THREE.Vector3;

    constructor(x: number, y: number, z: number) {
        this.position = new THREE.Vector3(x, y, z);
        this.data = new Uint8Array(Chunk.SIZE * Chunk.SIZE * Chunk.SIZE);
        
        const geometry = new THREE.BufferGeometry();
        // Use shared material from TextureManager
        const material = TextureManager.getMaterial();
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(
            x * Chunk.SIZE,
            y * Chunk.SIZE,
            z * Chunk.SIZE
        );
    }

    public getVoxel(x: number, y: number, z: number): number {
        return this.data[y * Chunk.SIZE * Chunk.SIZE + z * Chunk.SIZE + x];
    }

    public setVoxel(x: number, y: number, z: number, type: number) {
        this.data[y * Chunk.SIZE * Chunk.SIZE + z * Chunk.SIZE + x] = type;
    }

    public updateMeshWithWorld(getVoxel: (x: number, y: number, z: number) => number) {
        const geometry = MeshBuilder.generateChunkMesh(
            Chunk.SIZE,
            this.data,
            getVoxel
        );
        this.mesh.geometry.dispose();
        this.mesh.geometry = geometry;
    }

    public dispose() {
        this.mesh.geometry.dispose();
    }
}
