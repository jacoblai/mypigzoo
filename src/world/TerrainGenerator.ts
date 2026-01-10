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
                
                const noise = this.noise2D(worldX * 0.05, worldZ * 0.05);
                const height = Math.floor((noise + 1) * 5) + 2;

                for (let y = 0; y < Chunk.SIZE; y++) {
                    const worldY = cy * Chunk.SIZE + y;
                    if (worldY < height - 1) {
                        chunk.setVoxel(x, y, z, BlockType.DIRT);
                    } else if (worldY === height - 1) {
                        chunk.setVoxel(x, y, z, BlockType.GRASS);
                    }
                }
            }
        }
    }
}
