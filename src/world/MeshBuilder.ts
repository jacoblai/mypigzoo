import * as THREE from 'three';
import { BlockType, BLOCK_TEXTURES } from './Block';

export class MeshBuilder {
    // Neighbor offsets: [x, y, z], faceCorners, normal, faceType
    private static readonly NEIGHBORS = [
        { dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]], normal: [1, 0, 0], face: 'side' }, // Right
        { dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]], normal: [-1, 0, 0], face: 'side' }, // Left
        { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]], normal: [0, 1, 0], face: 'top' }, // Top
        { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1]], normal: [0, -1, 0], face: 'bottom' }, // Bottom
        { dir: [0, 0, 1], corners: [[0, 1, 1], [0, 0, 1], [1, 1, 1], [1, 0, 1]], normal: [0, 0, 1], face: 'side' }, // Front
        { dir: [0, 0, -1], corners: [[1, 1, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0]], normal: [0, 0, -1], face: 'side' }, // Back
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

        const ATLAS_SIZE = 16; // 16x16 tiles
        const TILE_SIZE = 1 / ATLAS_SIZE;

        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                for (let x = 0; x < size; x++) {
                    const blockType = getVoxel(x, y, z);
                    if (blockType === BlockType.AIR) continue;

                    const texData = BLOCK_TEXTURES[blockType];
                    if (!texData) continue;

                    for (const { dir, corners, normal, face } of this.NEIGHBORS) {
                        const nx = x + dir[0];
                        const ny = y + dir[1];
                        const nz = z + dir[2];

                        if (getVoxel(nx, ny, nz) === BlockType.AIR) {
                            // Determine texture coordinate for this face
                            let texCoords = texData.all || (texData as any)[face] || texData.side;
                            
                            // 稍微收缩 UV，消除白线缝隙 (UV Bleeding Fix)
                            const pad = 0.001;
                            const u0 = texCoords[0] * TILE_SIZE + pad;
                            const v0 = 1 - (texCoords[1] + 1) * TILE_SIZE + pad;
                            const size = TILE_SIZE - pad * 2;
                            
                            // 4 corners of the UV square
                            const uvCorners = [
                                [u0, v0 + size],
                                [u0, v0],
                                [u0 + size, v0 + size],
                                [u0 + size, v0]
                            ];

                            for (let i = 0; i < 4; i++) {
                                const corner = corners[i];
                                positions.push(x + corner[0], y + corner[1], z + corner[2]);
                                normals.push(...normal);
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
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

        return geometry;
    }
}
