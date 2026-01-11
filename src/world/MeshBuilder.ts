import * as THREE from 'three';
import { BlockType, BLOCK_DATA, RenderType } from './Block';

export class MeshBuilder {
    private static readonly NEIGHBORS = [
        { dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]], normal: [1, 0, 0], face: 'side' },
        { dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]], normal: [-1, 0, 0], face: 'side' },
        { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]], normal: [0, 1, 0], face: 'top' },
        { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1]], normal: [0, -1, 0], face: 'bottom' },
        { dir: [0, 0, 1], corners: [[0, 1, 1], [0, 0, 1], [1, 1, 1], [1, 0, 1]], normal: [0, 0, 1], face: 'side' },
        { dir: [0, 0, -1], corners: [[1, 1, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0]], normal: [0, 0, -1], face: 'side' },
    ];

    public static generateChunkMesh(
        size: number,
        data: Uint8Array,
        getVoxel: (x: number, y: number, z: number) => number
    ): THREE.BufferGeometry {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vertexCount = 0;

        const ATLAS_SIZE = 16;
        const TILE_SIZE = 1 / ATLAS_SIZE;

        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                for (let x = 0; x < size; x++) {
                    const blockType = getVoxel(x, y, z);
                    if (blockType === BlockType.AIR) continue;

                    const block = BLOCK_DATA[blockType];
                    if (!block) continue;

                    if (block.renderType === RenderType.CROSS) {
                        this.addCrossMesh(x, y, z, block, positions, normals, uvs, indices, vertexCount, TILE_SIZE);
                        vertexCount += 8;
                        continue;
                    }

                    // Cube rendering with Face Culling
                    for (const { dir, corners, normal, face } of this.NEIGHBORS) {
                        const nx = x + dir[0];
                        const ny = y + dir[1];
                        const nz = z + dir[2];

                        const neighborType = getVoxel(nx, ny, nz);
                        const neighbor = BLOCK_DATA[neighborType];

                        // Face Culling Logic (Minecraft-like):
                        let showFace = false;
                        if (neighborType === BlockType.AIR) {
                            showFace = true;
                        } else if (neighbor) {
                            if (block.isOpaque) {
                                // Opaque blocks show face if neighbor is not opaque
                                showFace = !neighbor.isOpaque;
                            } else {
                                // Transparent blocks (water, glass) show face if neighbor is a different block type
                                // This ensures water shows its face against stone, but not against other water
                                showFace = blockType !== neighborType;
                            }
                        }

                        if (showFace) {
                            const texCoords = block.textures.all || (block.textures as any)[face] || block.textures.side;
                            
                            // Minecraft water trick: Lower the surface of water blocks
                            let finalCorners = corners;
                            if (blockType === BlockType.WATER) {
                                finalCorners = corners.map(c => [c[0], c[1] === 1 ? 0.9 : c[1], c[2]]);
                            }

                            this.addFace(x, y, z, finalCorners, normal, texCoords, positions, normals, uvs, indices, vertexCount, TILE_SIZE);
                            vertexCount += 4;
                        }
                    }
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        return geometry;
    }

    private static addFace(
        x: number, y: number, z: number,
        corners: number[][],
        normal: number[],
        texCoords: [number, number],
        positions: number[],
        normals: number[],
        uvs: number[],
        indices: number[],
        vertexCount: number,
        TILE_SIZE: number
    ) {
        const pad = 0.001;
        const u0 = texCoords[0] * TILE_SIZE + pad;
        const v0 = 1 - (texCoords[1] + 1) * TILE_SIZE + pad;
        const size = TILE_SIZE - pad * 2;

        const uvCorners = [
            [u0, v0 + size], [u0, v0],
            [u0 + size, v0 + size], [u0 + size, v0]
        ];

        for (let i = 0; i < 4; i++) {
            positions.push(x + corners[i][0], y + corners[i][1], z + corners[i][2]);
            normals.push(...normal);
            uvs.push(uvCorners[i][0], uvCorners[i][1]);
        }

        indices.push(
            vertexCount, vertexCount + 1, vertexCount + 2,
            vertexCount + 2, vertexCount + 1, vertexCount + 3
        );
    }

    private static addCrossMesh(
        x: number, y: number, z: number,
        block: any,
        positions: number[],
        normals: number[],
        uvs: number[],
        indices: number[],
        vertexCount: number,
        TILE_SIZE: number
    ) {
        const texCoords = block.textures.all;
        const pad = 0.001;
        const u0 = texCoords[0] * TILE_SIZE + pad;
        const v0 = 1 - (texCoords[1] + 1) * TILE_SIZE + pad;
        const size = TILE_SIZE - pad * 2;

        const uvCorners = [
            [u0, v0 + size], [u0, v0],
            [u0 + size, v0 + size], [u0 + size, v0]
        ];

        // Two intersecting planes
        const planes = [
            [[0, 1, 0], [0, 0, 0], [1, 1, 1], [1, 0, 1]],
            [[0, 1, 1], [0, 0, 1], [1, 1, 0], [1, 0, 0]]
        ];

        for (const corners of planes) {
            for (let i = 0; i < 4; i++) {
                positions.push(x + corners[i][0], y + corners[i][1], z + corners[i][2]);
                normals.push(0, 1, 0); // Upwards normal for simple lighting
                uvs.push(uvCorners[i][0], uvCorners[i][1]);
            }
            indices.push(
                vertexCount, vertexCount + 1, vertexCount + 2,
                vertexCount + 2, vertexCount + 1, vertexCount + 3
            );
            vertexCount += 4;
        }
    }
}
