import * as THREE from 'three';
import { TextureManager } from '../core/TextureManager';

export class PigModel {
    public group: THREE.Group;
    private contentGroup: THREE.Group;
    
    public head: THREE.Group;
    public body: THREE.Mesh;
    public legLF: THREE.Group;
    public legRF: THREE.Group;
    public legLB: THREE.Group;
    public legRB: THREE.Group;
    public heart: THREE.Mesh | null = null;

    private readonly PX = 1 / 16;

    constructor() {
        this.group = new THREE.Group();
        this.contentGroup = new THREE.Group();
        this.group.add(this.contentGroup);

        const material = TextureManager.getMaterial();

        // 1. Body (10x8x14)
        // In Minecraft, the body is rotated or the dimensions are different. 
        // Let's use 10 wide, 8 high, 14 long.
        const bodyGeom = this.createSkinBoxGeometry(10, 8, 14, 16, 16);
        this.body = new THREE.Mesh(bodyGeom, material);
        this.body.position.set(0, 10 * this.PX, -3 * this.PX); // Centered: (14/2 - 3) = 4 forward, -10 back.
        this.contentGroup.add(this.body);

        // 2. Head (8x8x8)
        this.head = new THREE.Group();
        this.head.position.set(0, 12 * this.PX, 4 * this.PX); // Shifted from 7 to 4 to align with centered body
        
        const headMeshGeom = this.createSkinBoxGeometry(8, 8, 8, 0, 0);
        const headMesh = new THREE.Mesh(headMeshGeom, material);
        headMesh.position.y = 0; // Center it on the pivot
        this.head.add(headMesh);
        
        // Snout (4x3x2)
        const snoutGeom = this.createSkinBoxGeometry(4, 3, 2, 10, 14);
        const snout = new THREE.Mesh(snoutGeom, material);
        snout.position.set(0, -2 * this.PX, 5 * this.PX);
        this.head.add(snout);
        
        this.contentGroup.add(this.head);

        // 3. Legs (4x6x4)
        const legGeom = this.createSkinBoxGeometry(4, 6, 4, 0, 34);
        
        const createLeg = (x: number, z: number) => {
            const leg = new THREE.Group();
            leg.position.set(x * this.PX, 6 * this.PX, z * this.PX);
            const mesh = new THREE.Mesh(legGeom, material);
            mesh.position.y = -3 * this.PX;
            leg.add(mesh);
            return leg;
        };

        this.legLF = createLeg(-3, 2);
        this.legRF = createLeg(3, 2);
        this.legLB = createLeg(-3, -8);
        this.legRB = createLeg(3, -8);

        this.contentGroup.add(this.legLF, this.legRF, this.legLB, this.legRB);

        // 4. Heart (Simplified Plane)
        const heartGeom = new THREE.PlaneGeometry(8 * this.PX, 8 * this.PX);
        const heartMat = new THREE.MeshBasicMaterial({ 
            color: 0xff4444, 
            transparent: true, 
            side: THREE.DoubleSide,
            visible: false 
        });
        this.heart = new THREE.Mesh(heartGeom, heartMat);
        this.heart.position.y = 22 * this.PX;
        this.group.add(this.heart);
    }

    private createSkinBoxGeometry(w: number, h: number, d: number, sx: number, sy: number): THREE.BoxGeometry {
        const geom = new THREE.BoxGeometry(w * this.PX, h * this.PX, d * this.PX);

        // Add white vertex colors because the material uses vertexColors: true (for AO)
        const colors = new Float32Array(geom.attributes.position.count * 3).fill(1);
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const uvs = geom.attributes.uv.array as Float32Array;

        const ATLAS_SIZE = 256;
        const SKIN_X = 8 * 16;
        const SKIN_Y = 64;
        
        const setFaceUV = (faceIdx: number, x: number, y: number, width: number, height: number) => {
            const u = (SKIN_X + x) / ATLAS_SIZE;
            const v = 1 - (SKIN_Y + y + height) / ATLAS_SIZE;
            const uw = width / ATLAS_SIZE;
            const vh = height / ATLAS_SIZE;
            const start = faceIdx * 8;
            uvs[start + 0] = u;          uvs[start + 1] = v + vh;
            uvs[start + 2] = u + uw;     uvs[start + 3] = v + vh;
            uvs[start + 4] = u;          uvs[start + 5] = v;
            uvs[start + 6] = u + uw;     uvs[start + 7] = v;
        };

        // Standard Minecraft skin layout logic (modified for the specific parts)
        // Right, Left, Top, Bottom, Front, Back
        setFaceUV(0, sx + d + w, sy + d, d, h);      // Right
        setFaceUV(1, sx, sy + d, d, h);              // Left
        setFaceUV(2, sx + d, sy, w, d);              // Top
        setFaceUV(3, sx + d + w, sy, w, d);          // Bottom
        setFaceUV(4, sx + d, sy + d, w, h);          // Front
        setFaceUV(5, sx + d + w + d, sy + d, w, h);  // Back

        return geom;
    }

    public updateAnimation(delta: number, walkTime: number, isMoving: boolean, inLove: boolean = false) {
        if (isMoving) {
            const speed = 10;
            const angle = Math.sin(walkTime * speed) * 0.5;
            this.legLF.rotation.x = angle;
            this.legRF.rotation.x = -angle;
            this.legLB.rotation.x = -angle;
            this.legRB.rotation.x = angle;
            
            this.contentGroup.position.y = Math.abs(Math.cos(walkTime * speed)) * 0.02;
        } else {
            const lerp = 0.1;
            this.legLF.rotation.x *= (1 - lerp);
            this.legRF.rotation.x *= (1 - lerp);
            this.legLB.rotation.x *= (1 - lerp);
            this.legRB.rotation.x *= (1 - lerp);
            this.contentGroup.position.y *= (1 - lerp);
        }

        if (this.heart) {
            this.heart.visible = inLove;
            if (inLove) {
                this.heart.rotation.y += delta * 5;
                this.heart.position.y = (22 * this.PX) + Math.sin(Date.now() * 0.005) * 0.1;
            }
        }
    }

    public applyTraits(color: THREE.Color, scale: number) {
        this.group.scale.set(scale, scale, scale);
        
        // Tint all meshes in the model
        this.group.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const geom = object.geometry as THREE.BufferGeometry;
                // Only tint meshes that have vertex colors (skin parts)
                if (geom.attributes.color) {
                    const colors = geom.attributes.color.array as Float32Array;
                    for (let i = 0; i < colors.length; i += 3) {
                        colors[i] = color.r;
                        colors[i + 1] = color.g;
                        colors[i + 2] = color.b;
                    }
                    geom.attributes.color.needsUpdate = true;
                }
            }
        });
    }
}
