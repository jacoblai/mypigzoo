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

        // --- Player Skin (Starting at 8, 0) ---
        // We will draw a 64x32 area representing a classic Steve skin
        this.drawSteveSkin(ctx, 8 * 16, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    /**
     * Draws a procedurally generated Steve-like skin onto the atlas
     */
    private static drawSteveSkin(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
        // Colors
        const skin = '#ffdbac';
        const skinShadow = '#e0ac69';
        const hair = '#3d2b1f';
        const eyes = '#ffffff';
        const pupils = '#4040ff';
        const mouth = '#8d6e63';
        const shirt = '#1976d2';
        const shirtTrim = '#1565c0';
        const pants = '#303f9f';
        const shoes = '#333333';

        const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
            ctx.fillStyle = color;
            ctx.fillRect(offsetX + x, offsetY + y, w, h);
        };

        // --- Head ---
        // Top/Bottom (8,0 to 24,8)
        fillRect(8, 0, 8, 8, hair);     // Top
        fillRect(16, 0, 8, 8, skin);    // Bottom (Neck area)
        // Sides (0,8 to 32,16)
        fillRect(0, 8, 8, 8, hair);     // Right side
        fillRect(8, 8, 8, 8, skin);     // Front (Face)
        fillRect(16, 8, 8, 8, skin);    // Left side
        fillRect(24, 8, 8, 8, hair);    // Back

        // Face details
        fillRect(8, 8, 8, 3, hair);     // Hairline
        fillRect(10, 11, 2, 1, eyes);   // Left eye white
        fillRect(14, 11, 2, 1, eyes);   // Right eye white
        fillRect(11, 11, 1, 1, pupils); // Left pupil
        fillRect(14, 11, 1, 1, pupils); // Right pupil
        fillRect(11, 13, 2, 1, mouth);  // Mouth/Nose area
        fillRect(10, 12, 1, 1, hair);   // Left sideburn
        fillRect(15, 12, 1, 1, hair);   // Right sideburn

        // --- Body ---
        // Top/Bottom
        fillRect(20, 16, 8, 4, shirt);  // Top
        fillRect(28, 16, 8, 4, pants);  // Bottom
        // Sides
        fillRect(16, 20, 4, 12, shirt); // Right
        fillRect(20, 20, 8, 12, shirt); // Front
        fillRect(28, 20, 4, 12, shirt); // Left
        fillRect(32, 20, 8, 12, shirt); // Back
        // Body details
        fillRect(23, 20, 2, 2, skin);   // Neck V-neck

        // --- Arms (Right arm, will be reused for left) ---
        // Top/Bottom
        fillRect(44, 16, 4, 4, shirt);  // Top
        fillRect(48, 16, 4, 4, skin);   // Bottom
        // Sides
        fillRect(40, 20, 4, 12, shirt); // Right (Outer)
        fillRect(44, 20, 4, 12, shirt); // Front
        fillRect(48, 20, 4, 12, shirt); // Left (Inner)
        fillRect(52, 20, 4, 12, shirt); // Back
        // Arm skin (bottom half)
        fillRect(40, 26, 16, 6, skin);  // All sides skin below elbow

        // --- Legs (Right leg, will be reused for left) ---
        // Top/Bottom
        fillRect(4, 16, 4, 4, pants);   // Top
        fillRect(8, 16, 4, 4, shoes);   // Bottom
        // Sides
        fillRect(0, 20, 4, 12, pants);  // Right (Outer)
        fillRect(4, 20, 4, 12, pants);  // Front
        fillRect(8, 20, 4, 12, pants);  // Left (Inner)
        fillRect(12, 20, 4, 12, pants); // Back
        // Shoes
        fillRect(0, 30, 16, 2, shoes);  // Shoes at bottom
    }

    public static getAtlasDataURL(): string {
        if (!this.texture) this.getMaterial();
        return (this.texture.image as HTMLCanvasElement).toDataURL();
    }
}
