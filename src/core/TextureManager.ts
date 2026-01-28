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
                alphaTest: 0.1, 
                side: THREE.DoubleSide,
                vertexColors: true
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

        // Helper to draw a pixel with noise
        const drawPixel = (px: number, py: number, color: {r: number, g: number, b: number, a?: number}, noise: number = 0) => {
            const factor = 1 + (Math.random() - 0.5) * noise;
            const r = Math.min(255, Math.max(0, Math.floor(color.r * factor)));
            const g = Math.min(255, Math.max(0, Math.floor(color.g * factor)));
            const b = Math.min(255, Math.max(0, Math.floor(color.b * factor)));
            const a = color.a !== undefined ? color.a : 1.0;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            ctx.fillRect(px, py, 1, 1);
        };

        const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return { r, g, b };
        };

        // --- Optimized Procedural Textures ---

        // Stone (3, 0) - More structured rock look
        const stoneColor = hexToRgb('#888888');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 3 * 16 + x;
                const py = 0 * 16 + y;
                // Add some structural noise for cracks
                const isCrack = Math.random() < 0.05 || (x + y) % 7 === 0 && Math.random() < 0.2;
                drawPixel(px, py, stoneColor, isCrack ? 0.3 : 0.1);
            }
        }

        // Cobblestone (0, 1) - Defined stones
        const cobbleColor = hexToRgb('#777777');
        const cobbleBorder = hexToRgb('#444444');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 0 * 16 + x;
                const py = 1 * 16 + y;
                const isEdge = x === 0 || y === 0 || x === 8 || y === 8;
                drawPixel(px, py, isEdge ? cobbleBorder : cobbleColor, 0.15);
            }
        }

        // Dirt (2, 0)
        const dirtColor = hexToRgb('#795548');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 2 * 16 + x;
                const py = 0 * 16 + y;
                drawPixel(px, py, dirtColor, 0.2);
            }
        }

        // Grass Top (0, 0)
        const grassColor = hexToRgb('#4aad31');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 0 * 16 + x;
                const py = 0 * 16 + y;
                // Clumped grass look
                const noise = (Math.sin(x * 0.5) + Math.cos(y * 0.5)) * 0.1;
                drawPixel(px, py, grassColor, 0.15 + noise);
            }
        }

        // Grass Side (1, 0)
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 1 * 16 + x;
                const py = 0 * 16 + y;
                // Jagged transition from grass to dirt
                const grassDepth = 4 + Math.sin(x * 0.8) * 2 + (Math.random() - 0.5) * 2;
                if (y < grassDepth) {
                    drawPixel(px, py, grassColor, 0.15);
                } else {
                    drawPixel(px, py, dirtColor, 0.15);
                }
            }
        }

        // Wood Side (4, 1) - Vertical grain
        const logColor = hexToRgb('#6d4c41');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 4 * 16 + x;
                const py = 1 * 16 + y;
                const grain = Math.sin(x * 0.5) * 0.1;
                drawPixel(px, py, logColor, 0.1 + grain);
            }
        }

        // Wood Top (5, 1) - Concentric rings
        const ringColor1 = hexToRgb('#d7ccc8');
        const ringColor2 = hexToRgb('#bcaaa4');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 5 * 16 + x;
                const py = 1 * 16 + y;
                const dist = Math.sqrt((x - 7.5)**2 + (y - 7.5)**2);
                const ring = Math.floor(dist) % 2 === 0;
                drawPixel(px, py, ring ? ringColor1 : ringColor2, 0.05);
            }
        }

        // Sand (2, 1)
        const sandColor = hexToRgb('#ddd199');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 2 * 16 + x;
                const py = 1 * 16 + y;
                drawPixel(px, py, sandColor, 0.1);
            }
        }

        // Gravel (3, 1)
        const gravelColor = hexToRgb('#9e9e9e');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 3 * 16 + x;
                const py = 1 * 16 + y;
                drawPixel(px, py, gravelColor, 0.3);
            }
        }

        // Bedrock (1, 1)
        const bedrockColor = hexToRgb('#333333');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 1 * 16 + x;
                const py = 1 * 16 + y;
                drawPixel(px, py, bedrockColor, 0.5);
            }
        }

        // Planks (4, 0)
        const plankColor = hexToRgb('#8d6e63');
        const plankBorder = hexToRgb('#5d4037');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 4 * 16 + x;
                const py = 0 * 16 + y;
                const isEdge = y % 8 === 0 || x === 0 || x === 15;
                drawPixel(px, py, isEdge ? plankBorder : plankColor, 0.1);
            }
        }

        // Leaves (4, 3)
        const leafColor = hexToRgb('#2e7d32');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 4 * 16 + x;
                const py = 3 * 16 + y;
                const isHole = Math.random() < 0.15;
                if (!isHole) {
                    drawPixel(px, py, leafColor, 0.3);
                }
            }
        }

        // Ores
        const drawOre = (tx: number, ty: number, oreColorHex: string) => {
            const oreColor = hexToRgb(oreColorHex);
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const px = tx * 16 + x;
                    const py = ty * 16 + y;
                    const isOre = Math.random() < 0.1 && (
                        (x > 2 && x < 13 && y > 2 && y < 13)
                    );
                    drawPixel(px, py, isOre ? oreColor : stoneColor, isOre ? 0.1 : 0.1);
                }
            }
        };
        drawOre(2, 2, '#333333'); // Coal
        drawOre(1, 2, '#e2c0aa'); // Iron
        drawOre(0, 2, '#fdd835'); // Gold
        drawOre(2, 3, '#00e5ff'); // Diamond

        // Glass (1, 3)
        const glassColor = { r: 255, g: 255, b: 255, a: 0.3 };
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 1 * 16 + x;
                const py = 3 * 16 + y;
                const isFrame = x === 0 || x === 15 || y === 0 || y === 15;
                const isReflection = (x + y === 6 || x + y === 7) && x > 2 && x < 10;
                if (isFrame) {
                    drawPixel(px, py, { r: 255, g: 255, b: 255, a: 0.5 }, 0);
                } else if (isReflection) {
                    drawPixel(px, py, { r: 255, g: 255, b: 255, a: 0.4 }, 0);
                }
            }
        }

        // Water (14, 0)
        const waterBase = hexToRgb('#3f76e4');
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const px = 14 * 16 + x;
                const py = 0 * 16 + y;
                drawPixel(px, py, { ...waterBase, a: 0.7 }, 0.2);
            }
        }

        // Cross types (Flowers/Grass)
        const drawCross = (tx: number, ty: number, colorHex: string, type: 'grass' | 'flower') => {
            const color = hexToRgb(colorHex);
            for (let y = 4; y < 16; y++) {
                for (let x = 4; x < 12; x++) {
                    const px = tx * 16 + x;
                    const py = ty * 16 + y;
                    if (type === 'grass') {
                        if (Math.random() < 0.6) drawPixel(px, py, color, 0.3);
                    } else {
                        const isStem = x >= 7 && x <= 8;
                        const isPetal = y < 8 && Math.abs(x - 7.5) < 3;
                        if (isPetal) drawPixel(px, py, color, 0.1);
                        else if (isStem) drawPixel(px, py, hexToRgb('#4aad31'), 0.1);
                    }
                }
            }
        };
        drawCross(7, 2, '#4aad31', 'grass'); // Tall Grass
        drawCross(13, 0, '#fdd835', 'flower'); // Dandelion
        drawCross(12, 0, '#e53935', 'flower'); // Rose
        
        // Pork (13, 1)
        this.drawPork(ctx, 13 * 16, 1 * 16);

        // Tools & Materials
        this.drawStick(ctx, 6 * 16, 0 * 16);
        this.drawPickaxe(ctx, 6 * 16, 1 * 16, '#a9825a', '#6d4c41'); // Wooden Pickaxe
        this.drawPickaxe(ctx, 6 * 16, 2 * 16, '#9e9e9e', '#6d4c41'); // Stone Pickaxe

        // Hand & Player
        this.drawSteveSkin(ctx, 8 * 16, 0);
        
        // Animals
        this.drawPigSkin(ctx, 8 * 16, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    /**
     * Draws a procedurally generated Pig skin onto the atlas
     */
    private static drawPigSkin(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
        const pink = '#ffafaf';
        const pinkShadow = '#f08080';
        const snoutColor = '#ffc0cb';
        const eyeWhite = '#ffffff';
        const eyeBlack = '#000000';

        const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
            ctx.fillStyle = color;
            ctx.fillRect(offsetX + x, offsetY + y, w, h);
        };

        // --- Head (8x8x8) at (0, 0) ---
        // Layout: Top(8,0), Bottom(16,0), Left(0,8), Front(8,8), Right(16,8), Back(24,8)
        fillRect(8, 0, 8, 8, pinkShadow);  // Top
        fillRect(16, 0, 8, 8, pinkShadow); // Bottom
        fillRect(0, 8, 8, 8, pink);        // Left
        fillRect(8, 8, 8, 8, pink);        // Front
        fillRect(16, 8, 8, 8, pink);       // Right
        fillRect(24, 8, 8, 8, pink);       // Back
        
        // Eyes (Front is 8,8)
        fillRect(9, 11, 2, 1, eyeWhite);
        fillRect(13, 11, 2, 1, eyeWhite);
        fillRect(9, 11, 1, 1, eyeBlack);
        fillRect(14, 11, 1, 1, eyeBlack);

        // --- Snout (4x3x2) at (10, 14) ---
        // Layout: Front at sx+d, sy+d = 10+2, 14+2 = 12, 16
        fillRect(12, 16, 4, 3, snoutColor); 
        fillRect(13, 17, 1, 1, pinkShadow); // Nostril L
        fillRect(15, 17, 1, 1, pinkShadow); // Nostril R

        // --- Body (10x8x14) at (16, 16) ---
        // sx=16, sy=16, w=10, h=8, d=14
        // Top: (sx+d, sy) = (30, 16) size 10x14
        fillRect(30, 16, 10, 14, pinkShadow); 
        // Bottom: (sx+d+w, sy) = (40, 16) size 10x14
        fillRect(40, 16, 10, 14, pinkShadow); 
        // Left: (sx, sy+d) = (16, 30) size 14x8
        fillRect(16, 30, 14, 8, pink); 
        // Front: (sx+d, sy+d) = (30, 30) size 10x8
        fillRect(30, 30, 10, 8, pink); 
        // Right: (sx+d+w, sy+d) = (40, 30) size 14x8
        fillRect(40, 30, 14, 8, pink); 
        // Back: (sx+d+w+d, sy+d) = (54, 30) size 10x8
        fillRect(54, 30, 10, 8, pink); 

        // --- Legs (4x6x4) at (0, 34) ---
        // sx=0, sy=34, w=4, h=6, d=4
        fillRect(4, 34, 4, 4, pinkShadow);  // Top
        fillRect(8, 34, 4, 4, pinkShadow);  // Bottom
        fillRect(0, 38, 4, 6, pink);        // Left
        fillRect(4, 38, 4, 6, pink);        // Front
        fillRect(8, 38, 4, 6, pink);        // Right
        fillRect(12, 38, 4, 6, pink);       // Back
    }

    private static drawPork(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
        const porkColor = '#f48fb1';
        const fatColor = '#ffffff';
        const edgeColor = '#c2185b';

        const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
            ctx.fillStyle = color;
            ctx.fillRect(offsetX + x, offsetY + y, w, h);
        };

        // Simple raw porkchop shape
        fillRect(2, 4, 12, 8, porkColor);
        fillRect(4, 2, 8, 12, porkColor);
        
        // Fat streaks
        fillRect(4, 4, 2, 2, fatColor);
        fillRect(10, 10, 2, 2, fatColor);
        
        // Darker edges
        fillRect(2, 4, 1, 8, edgeColor);
        fillRect(13, 4, 1, 8, edgeColor);
        fillRect(4, 2, 8, 1, edgeColor);
        fillRect(4, 13, 8, 1, edgeColor);
    }

    private static drawStick(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
        const main = '#8d6e63';
        const highlight = '#a9825a';
        const shadow = '#5d4037';

        const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
            ctx.fillStyle = color;
            ctx.fillRect(offsetX + x, offsetY + y, w, h);
        };

        // Simple vertical stick with highlight
        fillRect(7, 2, 2, 12, main);
        fillRect(7, 2, 1, 12, highlight);
        fillRect(8, 2, 1, 12, shadow);
    }

    private static drawPickaxe(
        ctx: CanvasRenderingContext2D,
        offsetX: number,
        offsetY: number,
        headColor: string,
        handleColor: string
    ) {
        const headShadow = '#6f6f6f';
        const handleHighlight = '#a9825a';

        const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
            ctx.fillStyle = color;
            ctx.fillRect(offsetX + x, offsetY + y, w, h);
        };

        // Pickaxe head
        fillRect(2, 3, 12, 2, headColor);
        fillRect(2, 5, 12, 1, headShadow);
        fillRect(4, 6, 2, 2, headColor);
        fillRect(10, 6, 2, 2, headColor);

        // Handle
        fillRect(7, 5, 2, 9, handleColor);
        fillRect(7, 5, 1, 9, handleHighlight);
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
