import * as THREE from 'three';
import { Chunk } from './Chunk';
import { TerrainGenerator } from './TerrainGenerator';

export class World {
    private chunks: Map<string, Chunk> = new Map();
    public scene: THREE.Scene;
    private generator: TerrainGenerator;
    
    public renderDistance = 4;
    public renderDistanceY = 2; // Support vertical chunks

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.generator = new TerrainGenerator();
    }

    private getChunkKey(x: number, y: number, z: number): string {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }

    public update(playerPosition: THREE.Vector3) {
        const px = Math.floor(playerPosition.x / Chunk.SIZE);
        const py = Math.floor(playerPosition.y / Chunk.SIZE);
        const pz = Math.floor(playerPosition.z / Chunk.SIZE);

        const currentChunkKeys = new Set<string>();

        // 1. Identify chunks that should be loaded
        for (let x = px - this.renderDistance; x <= px + this.renderDistance; x++) {
            for (let z = pz - this.renderDistance; z <= pz + this.renderDistance; z++) {
                for (let y = py - this.renderDistanceY; y <= py + this.renderDistanceY; y++) {
                    const key = this.getChunkKey(x, y, z);
                    currentChunkKeys.add(key);

                    if (!this.chunks.has(key)) {
                        this.loadChunk(x, y, z);
                    }
                }
            }
        }

        // 2. Identify and unload chunks that are out of range
        for (const [key, chunk] of this.chunks) {
            if (!currentChunkKeys.has(key)) {
                this.unloadChunk(key, chunk);
            }
        }
    }

    private loadChunk(x: number, y: number, z: number) {
        const chunk = new Chunk(x, y, z);
        this.chunks.set(this.getChunkKey(x, y, z), chunk);
        
        this.generator.generateChunk(chunk);
        this.scene.add(chunk.mesh);
        
        // Update the chunk and its neighbors to ensure seamless rendering
        this.updateChunkAndNeighbors(x, y, z);
    }

    private unloadChunk(key: string, chunk: Chunk) {
        this.scene.remove(chunk.mesh);
        chunk.dispose();
        this.chunks.delete(key);
    }

    private updateChunkAndNeighbors(cx: number, cy: number, cz: number) {
        for (let x = cx - 1; x <= cx + 1; x++) {
            for (let y = cy - 1; y <= cy + 1; y++) {
                for (let z = cz - 1; z <= cz + 1; z++) {
                    const key = this.getChunkKey(x, y, z);
                    if (this.chunks.has(key)) {
                        this.updateChunkMesh(x * Chunk.SIZE, y * Chunk.SIZE, z * Chunk.SIZE);
                    }
                }
            }
        }
    }

    public getVoxel(x: number, y: number, z: number): number {
        const cx = Math.floor(x / Chunk.SIZE);
        const cy = Math.floor(y / Chunk.SIZE);
        const cz = Math.floor(z / Chunk.SIZE);

        const chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
        if (!chunk) return 0;

        const lx = Math.floor(((x % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE);
        const ly = Math.floor(((y % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE);
        const lz = Math.floor(((z % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE);

        return chunk.getVoxel(lx, ly, lz);
    }

    public setVoxel(x: number, y: number, z: number, type: number) {
        const cx = Math.floor(x / Chunk.SIZE);
        const cy = Math.floor(y / Chunk.SIZE);
        const cz = Math.floor(z / Chunk.SIZE);

        const chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
        if (!chunk) return;

        const lx = Math.floor(((x % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE);
        const ly = Math.floor(((y % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE);
        const lz = Math.floor(((z % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE);

        chunk.setVoxel(lx, ly, lz, type);
        this.updateVoxelMesh(x, y, z);

        // Notify neighbors of potential mesh changes
        if (lx === 0) this.updateVoxelMesh(x - 1, y, z);
        if (lx === Chunk.SIZE - 1) this.updateVoxelMesh(x + 1, y, z);
        if (ly === 0) this.updateVoxelMesh(x, y - 1, z);
        if (ly === Chunk.SIZE - 1) this.updateVoxelMesh(x, y + 1, z);
        if (lz === 0) this.updateVoxelMesh(x, y, z - 1);
        if (lz === Chunk.SIZE - 1) this.updateVoxelMesh(x, y, z + 1);
    }

    private updateVoxelMesh(x: number, y: number, z: number) {
        const cx = Math.floor(x / Chunk.SIZE);
        const cy = Math.floor(y / Chunk.SIZE);
        const cz = Math.floor(z / Chunk.SIZE);
        this.updateChunkMesh(cx * Chunk.SIZE, cy * Chunk.SIZE, cz * Chunk.SIZE);
    }

    private updateChunkMesh(worldX: number, worldY: number, worldZ: number) {
        const cx = Math.floor(worldX / Chunk.SIZE);
        const cy = Math.floor(worldY / Chunk.SIZE);
        const cz = Math.floor(worldZ / Chunk.SIZE);
        const chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
        if (chunk) {
            chunk.updateMeshWithWorld((lx, ly, lz) => {
                return this.getVoxel(cx * Chunk.SIZE + lx, cy * Chunk.SIZE + ly, cz * Chunk.SIZE + lz);
            });
        }
    }
}
