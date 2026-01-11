import * as THREE from 'three';
import { BlockType, BLOCK_DATA, RenderType } from '../world/Block';

export class TextureManager {
    private static texture: THREE.Texture;
    private static material: THREE.MeshLambertMaterial;
    private static readonly ATLAS_SIZE = 256;
    private static readonly TILE_COUNT = 16;
    private static readonly TILE_PIXELS = 16;

    public static getMaterial(): THREE.MeshLambertMaterial {
        if (!this.material) {
            this.texture = this.createDefaultAtlas();
            this.texture.magFilter = THREE.NearestFilter;
            this.texture.minFilter = THREE.NearestFilter;
            
            this.material = new THREE.MeshLambertMaterial({
                map: this.texture,
                transparent: true,
                alphaTest: 0.01, // 降低阈值以允许半透明水体渲染
                side: THREE.DoubleSide
            });
        }
        return this.material;
    }

    private static createDefaultAtlas(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = this.ATLAS_SIZE;
        canvas.height = this.ATLAS_SIZE;
        const ctx = canvas.getContext('2d', { alpha: true })!;

        // Fill with transparent
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Helper to draw a pixel-art tile
        const drawTile = (tx: number, ty: number, colors: string[], pattern: number[][]) => {
            const px = tx * this.TILE_PIXELS;
            const py = ty * this.TILE_PIXELS;
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const colorIndex = pattern[y][x];
                    if (colorIndex >= 0) {
                        ctx.fillStyle = colors[colorIndex];
                        ctx.fillRect(px + x, py + y, 1, 1);
                    }
                }
            }
        };

        // Noise generator for textures
        const getNoisePattern = (seed: number = 0) => {
            const pattern: number[][] = [];
            for (let y = 0; y < 16; y++) {
                pattern[y] = [];
                for (let x = 0; x < 16; x++) {
                    pattern[y][x] = Math.floor(Math.random() * 3);
                }
            }
            return pattern;
        };

        // --- Generate Procedural Textures ---

        // Stone (3, 0)
        drawTile(3, 0, ['#888888', '#777777', '#999999'], getNoisePattern());
        // Cobblestone (0, 1)
        drawTile(0, 1, ['#777777', '#555555', '#999999'], getNoisePattern());
        // Grass Top (0, 0)
        drawTile(0, 0, ['#4aad31', '#5ebf44', '#3d8e28'], getNoisePattern());
        // Grass Side (1, 0) - Mix of dirt and grass
        const grassSidePattern = getNoisePattern();
        for(let x=0; x<16; x++) for(let y=0; y<4; y++) grassSidePattern[y][x] = Math.random() > 0.3 ? 0 : 3;
        drawTile(1, 0, ['#4aad31', '#795548', '#8d6e63', '#5ebf44'], grassSidePattern);
        // Dirt (2, 0)
        drawTile(2, 0, ['#795548', '#8d6e63', '#6d4c41'], getNoisePattern());
        // Sand (2, 1)
        drawTile(2, 1, ['#ddd199', '#e8dfae', '#d3c68a'], getNoisePattern());
        // Gravel (3, 1)
        drawTile(3, 1, ['#9e9e9e', '#888888', '#bdbdbd'], getNoisePattern());
        // Bedrock (1, 1)
        drawTile(1, 1, ['#333333', '#111111', '#555555'], getNoisePattern());
        
        // Wood Side (4, 1)
        drawTile(4, 1, ['#6d4c41', '#5d4037', '#795548'], getNoisePattern());
        // Wood Top (5, 1)
        drawTile(5, 1, ['#d7ccc8', '#bcaaa4', '#8d6e63'], getNoisePattern());
        
        // Skin for Hand (4, 0)
        drawTile(4, 0, ['#ffdbac', '#f1c27d', '#e0ac69'], getNoisePattern());

        // Clothes (Blue shirt) (5, 0)
        drawTile(5, 0, ['#1976d2', '#2196f3', '#1565c0'], getNoisePattern());

        // Pants (Dark blue) (6, 0)
        drawTile(6, 0, ['#303f9f', '#3f51b5', '#283593'], getNoisePattern());
        
        // Leaves (4, 3) - Sparse pattern
        const leavesPattern = getNoisePattern();
        const leavesColors = ['#2e7d32', '#388e3c', '#1b5e20'];
        drawTile(4, 3, leavesColors, leavesPattern);

        // Ores
        const drawOre = (tx: number, ty: number, oreColor: string) => {
            const pattern = getNoisePattern();
            const colors = ['#888888', '#777777', oreColor];
            for(let i=0; i<20; i++) pattern[Math.floor(Math.random()*16)][Math.floor(Math.random()*16)] = 2;
            drawTile(tx, ty, colors, pattern);
        };
        drawOre(2, 2, '#333333'); // Coal
        drawOre(1, 2, '#e2c0aa'); // Iron
        drawOre(0, 2, '#fdd835'); // Gold
        drawOre(2, 3, '#00e5ff'); // Diamond

        // Glass (1, 3)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(1 * 16 + 0.5, 3 * 16 + 0.5, 15, 15);
        ctx.beginPath();
        ctx.moveTo(1*16+3, 3*16+3); ctx.lineTo(1*16+6, 3*16+6);
        ctx.stroke();

        // Cross types (Flowers/Grass) - Simple shapes
        const drawCross = (tx: number, ty: number, color: string) => {
            const px = tx * 16; const py = ty * 16;
            ctx.fillStyle = color;
            ctx.fillRect(px + 6, py + 4, 4, 12);
            ctx.fillRect(px + 4, py + 6, 8, 4);
        };
        drawCross(7, 2, '#4aad31'); // Tall Grass
        drawCross(13, 0, '#fdd835'); // Dandelion
        drawCross(12, 0, '#e53935'); // Rose

        // Water (14, 0)
        const waterPattern = getNoisePattern();
        drawTile(14, 0, [
            'rgba(63, 118, 228, 0.7)', 
            'rgba(66, 135, 245, 0.7)', 
            'rgba(50, 100, 200, 0.7)'
        ], waterPattern);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    public static getAtlasDataURL(): string {
        if (!this.texture) this.getMaterial();
        return (this.texture.image as HTMLCanvasElement).toDataURL();
    }
}
