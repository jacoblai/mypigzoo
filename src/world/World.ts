import * as THREE from 'three';
import { Chunk } from './Chunk';
import { TerrainGenerator } from './TerrainGenerator';
import { BlockType, BLOCK_DATA } from './Block';

export class World {
    private chunks: Map<string, Chunk> = new Map();
    public scene: THREE.Scene;
    private generator: TerrainGenerator;
    
    public renderDistance = 4;
    public renderDistanceY = 2; 

    // Task Queues for performance
    private chunkLoadQueue: {x: number, y: number, z: number}[] = [];
    private meshUpdateQueue: Set<string> = new Set();
    
    // Performance constants
    private readonly MAX_CHUNKS_PER_FRAME = 1;
    private readonly MAX_MESH_UPDATES_PER_FRAME = 2;

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
                        // Check if already in queue to avoid duplicates
                        if (!this.chunkLoadQueue.some(c => c.x === x && c.y === y && c.z === z)) {
                            this.chunkLoadQueue.push({x, y, z});
                        }
                    }
                }
            }
        }

        // Sort queue by distance to player (Load closest first)
        this.chunkLoadQueue.sort((a, b) => {
            const distA = Math.hypot(a.x - px, a.y - py, a.z - pz);
            const distB = Math.hypot(b.x - px, b.y - py, b.z - pz);
            return distA - distB;
        });

        // 2. Process queues with budget
        this.processQueues();

        // 3. Unload chunks that are out of range
        for (const [key, chunk] of this.chunks) {
            if (!currentChunkKeys.has(key)) {
                this.unloadChunk(key, chunk);
            }
        }
    }

    private processQueues() {
        // Budget 1: Loading Chunks (Terrain generation)
        let chunksLoaded = 0;
        while (this.chunkLoadQueue.length > 0 && chunksLoaded < this.MAX_CHUNKS_PER_FRAME) {
            const next = this.chunkLoadQueue.shift();
            if (next) {
                this.loadChunk(next.x, next.y, next.z);
                chunksLoaded++;
            }
        }

        // Budget 2: Updating Meshes (Geometry generation)
        let meshesUpdated = 0;
        const updateList = Array.from(this.meshUpdateQueue);
        while (updateList.length > 0 && meshesUpdated < this.MAX_MESH_UPDATES_PER_FRAME) {
            const key = updateList.shift();
            if (key) {
                this.meshUpdateQueue.delete(key);
                const coords = key.split(',').map(Number);
                this.updateChunkMesh(coords[0] * Chunk.SIZE, coords[1] * Chunk.SIZE, coords[2] * Chunk.SIZE);
                meshesUpdated++;
            }
        }
    }

    private loadChunk(x: number, y: number, z: number) {
        const key = this.getChunkKey(x, y, z);
        if (this.chunks.has(key)) return;

        const chunk = new Chunk(x, y, z);
        this.chunks.set(key, chunk);
        
        this.generator.generateChunk(chunk);
        this.scene.add(chunk.mesh);
        
        // Notify neighbors to update their mesh (culling might change)
        this.enqueueChunkAndNeighbors(x, y, z);
    }

    private enqueueChunkAndNeighbors(cx: number, cy: number, cz: number) {
        const neighbors = [
            [0, 0, 0], 
            [1, 0, 0], [-1, 0, 0],
            [0, 1, 0], [0, -1, 0],
            [0, 0, 1], [0, 0, -1]
        ];

        for (const [dx, dy, dz] of neighbors) {
            const key = this.getChunkKey(cx + dx, cy + dy, cz + dz);
            if (this.chunks.has(key)) {
                this.meshUpdateQueue.add(key);
            }
        }
    }

    private unloadChunk(key: string, chunk: Chunk) {
        this.scene.remove(chunk.mesh);
        chunk.dispose();
        this.chunks.delete(key);
    }

    /**
     * Finds the highest solid block at the given x, z coordinates.
     * If the required chunk is not loaded, it will be loaded synchronously.
     */
    public getHighestSolidBlock(x: number, z: number, startY: number = 127): number {
        for (let y = startY; y >= 0; y--) {
            const voxel = this.getVoxel(x, y, z);
            if (voxel !== BlockType.AIR) {
                const blockData = BLOCK_DATA[voxel];
                if (blockData && blockData.isSolid) {
                    return y + 1;
                }
            }
        }
        return 0;
    }

    public getVoxel(x: number, y: number, z: number): number {
        const cx = Math.floor(x / Chunk.SIZE);
        const cy = Math.floor(y / Chunk.SIZE);
        const cz = Math.floor(z / Chunk.SIZE);

        const key = this.getChunkKey(cx, cy, cz);
        let chunk = this.chunks.get(key);
        
        // If chunk is not loaded, force synchronous load for critical queries
        if (!chunk) {
            this.loadChunk(cx, cy, cz);
            chunk = this.chunks.get(key)!;
        }

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
        
        // Use the queue system for mesh updates even for setVoxel
        this.enqueueVoxelNeighbors(x, y, z);
    }

    private enqueueVoxelNeighbors(x: number, y: number, z: number) {
        const cx = Math.floor(x / Chunk.SIZE);
        const cy = Math.floor(y / Chunk.SIZE);
        const cz = Math.floor(z / Chunk.SIZE);
        
        const lx = Math.floor(((x % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE);
        const ly = Math.floor(((y % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE);
        const lz = Math.floor(((z % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE);

        this.meshUpdateQueue.add(this.getChunkKey(cx, cy, cz));

        if (lx === 0) this.meshUpdateQueue.add(this.getChunkKey(cx - 1, cy, cz));
        if (lx === Chunk.SIZE - 1) this.meshUpdateQueue.add(this.getChunkKey(cx + 1, cy, cz));
        if (ly === 0) this.meshUpdateQueue.add(this.getChunkKey(cx, cy - 1, cz));
        if (ly === Chunk.SIZE - 1) this.meshUpdateQueue.add(this.getChunkKey(cx, cy + 1, cz));
        if (lz === 0) this.meshUpdateQueue.add(this.getChunkKey(cx, cy, cz - 1));
        if (lz === Chunk.SIZE - 1) this.meshUpdateQueue.add(this.getChunkKey(cx, cy, cz + 1));
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
