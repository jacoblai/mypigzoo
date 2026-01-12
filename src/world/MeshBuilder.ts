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
        const colors: number[] = [];
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
                        this.addCrossMesh(x, y, z, block, positions, normals, uvs, colors, indices, vertexCount, TILE_SIZE);
                        vertexCount += 8;
                        continue;
                    }

                    // Cube rendering with Face Culling and AO
                    for (const { dir, corners, normal, face } of this.NEIGHBORS) {
                        const nx = x + dir[0];
                        const ny = y + dir[1];
                        const nz = z + dir[2];

                        const neighborType = getVoxel(nx, ny, nz);
                        const neighbor = BLOCK_DATA[neighborType];

                        let showFace = false;
                        if (neighborType === BlockType.AIR) {
                            showFace = true;
                        } else if (neighbor) {
                            if (block.isOpaque) {
                                showFace = !neighbor.isOpaque;
                            } else {
                                showFace = blockType !== neighborType;
                            }
                        }

                        if (showFace) {
                            const texCoords = block.textures.all || (block.textures as any)[face] || block.textures.side;
                            
                            let finalCorners = corners;
                            if (blockType === BlockType.WATER) {
                                finalCorners = corners.map(c => [c[0], c[1] === 1 ? 0.9 : c[1], c[2]]);
                            }

                            // Calculate AO for each corner of this face
                            const aoValues = finalCorners.map(corner => {
                                return this.calculateAO(x, y, z, corner, normal, getVoxel);
                            });

                            this.addFace(x, y, z, finalCorners, normal, texCoords, aoValues, positions, normals, uvs, colors, indices, vertexCount, TILE_SIZE);
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
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        return geometry;
    }

    /**
     * Calculates Ambient Occlusion factor for a vertex.
     * Checks 3 neighbors around the corner in the plane of the face normal.
     */
    private static calculateAO(
        x: number, y: number, z: number,
        corner: number[],
        normal: number[],
        getVoxel: (x: number, y: number, z: number) => number
    ): number {
        // Find the 3 blocks surrounding this corner relative to the face
        const cx = x + corner[0];
        const cy = y + corner[1];
        const cz = z + corner[2];

        // The directions to check are based on which corner we are at and the face normal
        // We need to check the two side neighbors and the corner neighbor
        let dx1 = 0, dy1 = 0, dz1 = 0;
        let dx2 = 0, dy2 = 0, dz2 = 0;

        if (normal[0] !== 0) { // X face
            dy1 = corner[1] === 1 ? 0 : -1;
            dz2 = corner[2] === 1 ? 0 : -1;
        } else if (normal[1] !== 0) { // Y face
            dx1 = corner[0] === 1 ? 0 : -1;
            dz2 = corner[2] === 1 ? 0 : -1;
        } else if (normal[2] !== 0) { // Z face
            dx1 = corner[0] === 1 ? 0 : -1;
            dy2 = corner[1] === 1 ? 0 : -1;
        }

        const side1 = BLOCK_DATA[getVoxel(cx + dx1, cy + dy1, cz + dz1)]?.isOpaque ? 1 : 0;
        const side2 = BLOCK_DATA[getVoxel(cx + dx2, cy + dy2, cz + dz2)]?.isOpaque ? 1 : 0;
        const corner_occ = BLOCK_DATA[getVoxel(cx + dx1 + dx2, cy + dy1 + dy2, cz + dz1 + dz2)]?.isOpaque ? 1 : 0;

        // Standard AO formula: (side1 + side2 + corner) / 3
        // But if both sides are opaque, the corner doesn't matter
        if (side1 && side2) return 0.4;
        return 1.0 - (side1 + side2 + corner_occ) * 0.2;
    }

    private static addFace(
        x: number, y: number, z: number,
        corners: number[][],
        normal: number[],
        texCoords: [number, number],
        aoValues: number[],
        positions: number[],
        normals: number[],
        uvs: number[],
        colors: number[],
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
            // Use AO value to tint the vertex color
            const v = aoValues[i];
            colors.push(v, v, v);
        }

        // Handle the AO "anisotropy" (ensuring the quad is split correctly for shading)
        if (aoValues[0] + aoValues[3] > aoValues[1] + aoValues[2]) {
            indices.push(
                vertexCount, vertexCount + 1, vertexCount + 2,
                vertexCount + 2, vertexCount + 1, vertexCount + 3
            );
        } else {
            indices.push(
                vertexCount, vertexCount + 2, vertexCount + 3,
                vertexCount, vertexCount + 3, vertexCount + 1
            );
        }
    }

    private static addCrossMesh(
        x: number, y: number, z: number,
        block: any,
        positions: number[],
        normals: number[],
        uvs: number[],
        colors: number[],
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
                normals.push(0, 1, 0); 
                uvs.push(uvCorners[i][0], uvCorners[i][1]);
                colors.push(1, 1, 1); // No AO for cross meshes
            }
            indices.push(
                vertexCount, vertexCount + 1, vertexCount + 2,
                vertexCount + 2, vertexCount + 1, vertexCount + 3
            );
            vertexCount += 4;
        }
    }
}
