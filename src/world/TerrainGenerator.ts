import { createNoise2D } from 'simplex-noise';
import { Chunk } from './Chunk';
import { BlockType } from './Block';

export class TerrainGenerator {
    private noise2D = createNoise2D();

    public generateChunk(chunk: Chunk) {
        const cx = chunk.position.x;
        const cy = chunk.position.y;
        const cz = chunk.position.z;

        for (let x = 0; x < Chunk.SIZE; x++) {
            for (let z = 0; z < Chunk.SIZE; z++) {
                const worldX = cx * Chunk.SIZE + x;
                const worldZ = cz * Chunk.SIZE + z;
                
                // Base height using noise
                const noise = this.noise2D(worldX * 0.02, worldZ * 0.02);
                const mountainNoise = Math.pow(Math.max(0, this.noise2D(worldX * 0.01, worldZ * 0.01)), 2) * 20;
                const height = Math.floor((noise + 1) * 5) + 10 + Math.floor(mountainNoise);

                for (let y = 0; y < Chunk.SIZE; y++) {
                    const worldY = cy * Chunk.SIZE + y;
                    
                    if (worldY === 0) {
                        chunk.setVoxel(x, y, z, BlockType.BEDROCK);
                    } else if (worldY < height - 4) {
                        // Underground: Stone and Ores
                        let type = BlockType.STONE;
                        
                        // Simple ore distribution
                        const oreNoise = this.noise2D(worldX * 0.1, worldY * 0.1 + worldZ * 0.1);
                        if (oreNoise > 0.8) {
                            if (worldY < 5) type = BlockType.DIAMOND_ORE;
                            else if (worldY < 10) type = BlockType.GOLD_ORE;
                            else if (worldY < 15) type = BlockType.IRON_ORE;
                            else type = BlockType.COAL_ORE;
                        }
                        
                        chunk.setVoxel(x, y, z, type);
                    } else if (worldY < height - 1) {
                        // Subsurface: Dirt or Sand
                        const isBeach = height < 12;
                        chunk.setVoxel(x, y, z, isBeach ? BlockType.SAND : BlockType.DIRT);
                    } else if (worldY === height - 1) {
                        // Surface: Grass, Sand, or Gravel
                        const isBeach = height < 12;
                        const surfaceType = isBeach ? (Math.random() > 0.1 ? BlockType.SAND : BlockType.GRAVEL) : BlockType.GRASS;
                        chunk.setVoxel(x, y, z, surfaceType);

                        // Decorations on top of grass
                        if (surfaceType === BlockType.GRASS && Math.random() < 0.1) {
                            const deco = Math.random();
                            if (deco < 0.01) {
                                // Simple Tree (just a trunk and some leaves for now)
                                this.generateTree(chunk, x, y + 1, z);
                            } else if (deco < 0.08) {
                                chunk.setVoxel(x, y + 1, z, BlockType.TALL_GRASS);
                            } else if (deco < 0.09) {
                                chunk.setVoxel(x, y + 1, z, BlockType.DANDELION);
                            } else if (deco < 0.1) {
                                chunk.setVoxel(x, y + 1, z, BlockType.ROSE);
                            }
                        }
                    }
                }
            }
        }
    }

    private generateTree(chunk: Chunk, x: number, y: number, z: number) {
        const height = 4 + Math.floor(Math.random() * 2);
        
        // Trunk
        for (let i = 0; i < height; i++) {
            if (y + i < Chunk.SIZE) {
                chunk.setVoxel(x, y + i, z, BlockType.OAK_LOG);
            }
        }

        // Leaves
        const leafStart = height - 2;
        for (let ly = leafStart; ly <= height + 1; ly++) {
            const radius = ly > height ? 1 : 2;
            for (let lx = -radius; lx <= radius; lx++) {
                for (let lz = -radius; lz <= radius; lz++) {
                    if (Math.abs(lx) === radius && Math.abs(lz) === radius && Math.random() > 0.5) continue;
                    const wx = x + lx;
                    const wy = y + ly;
                    const wz = z + lz;
                    if (wx >= 0 && wx < Chunk.SIZE && wy >= 0 && wy < Chunk.SIZE && wz >= 0 && wz < Chunk.SIZE) {
                        if (chunk.getVoxel(wx, wy, wz) === BlockType.AIR) {
                            chunk.setVoxel(wx, wy, wz, BlockType.OAK_LEAVES);
                        }
                    }
                }
            }
        }
    }
}
