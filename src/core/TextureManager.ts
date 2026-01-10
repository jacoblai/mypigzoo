import * as THREE from 'three';

export class TextureManager {
    private static texture: THREE.Texture;
    private static material: THREE.MeshLambertMaterial;

    public static getMaterial(): THREE.MeshLambertMaterial {
        if (!this.material) {
            this.texture = this.createDefaultAtlas();
            this.texture.magFilter = THREE.NearestFilter; // Sharp pixels
            this.texture.minFilter = THREE.NearestFilter;
            
            this.material = new THREE.MeshLambertMaterial({
                map: this.texture,
                transparent: false,
                alphaTest: 0.1
            });
        }
        return this.material;
    }

    private static createDefaultAtlas(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        // Fill with magenta (error color)
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(0, 0, 256, 256);

        // Helper to draw a 16x16 tile
        const drawTile = (x: number, y: number, color1: string, color2: string, label: string) => {
            const px = x * 16;
            const py = y * 16;
            ctx.fillStyle = color1;
            ctx.fillRect(px, py, 16, 16);
            ctx.fillStyle = color2;
            ctx.fillRect(px + 2, py + 2, 12, 12);
            
            // Just a dot to distinguish
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(px + 4, py + 4, 2, 2);
        };

        // 0,0: Grass Top
        drawTile(0, 0, '#4aad31', '#5ebf44', 'GT');
        // 1,0: Grass Side
        drawTile(1, 0, '#795548', '#4aad31', 'GS');
        // 2,0: Dirt
        drawTile(2, 0, '#795548', '#8d6e63', 'D');
        // 3,0: Stone
        drawTile(3, 0, '#9e9e9e', '#bdbdbd', 'S');

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }
}
