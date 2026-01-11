import * as THREE from 'three';
import { TextureManager } from '../core/TextureManager';

export class CharacterModel {
    public group: THREE.Group;
    private contentGroup: THREE.Group; // 新增：用于处理内部动画起伏
    
    // Model parts
    public head: THREE.Mesh;
    public headGroup: THREE.Group;
    public torso: THREE.Mesh;
    public leftArm: THREE.Group;
    public rightArm: THREE.Group;
    public leftLeg: THREE.Group;
    public rightLeg: THREE.Group;

    private readonly PX = 1 / 16; 

    constructor() {
        this.group = new THREE.Group();
        this.contentGroup = new THREE.Group();
        this.group.add(this.contentGroup);

        const material = TextureManager.getMaterial();

        // 1. Torso
        const torsoGeom = this.createSkinBoxGeometry(8, 12, 4, 16, 16);
        this.torso = new THREE.Mesh(torsoGeom, material);
        this.torso.position.y = 12 * this.PX + (12 * this.PX) / 2;
        this.contentGroup.add(this.torso);

        // 2. Head
        const headGeom = this.createSkinBoxGeometry(8, 8, 8, 0, 0);
        this.head = new THREE.Mesh(headGeom, material);
        this.head.position.y = 4 * this.PX;
        
        this.headGroup = new THREE.Group();
        this.headGroup.position.y = 24 * this.PX;
        this.headGroup.add(this.head);
        this.contentGroup.add(this.headGroup);

        // 3. Legs
        const legGeom = this.createSkinBoxGeometry(4, 12, 4, 0, 16);
        
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-2 * this.PX, 12 * this.PX, 0);
        const leftLegMesh = new THREE.Mesh(legGeom, material);
        leftLegMesh.position.y = -6 * this.PX;
        this.leftLeg.add(leftLegMesh);
        this.contentGroup.add(this.leftLeg);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(2 * this.PX, 12 * this.PX, 0);
        const rightLegMesh = new THREE.Mesh(legGeom, material);
        rightLegMesh.position.y = -6 * this.PX;
        this.rightLeg.add(rightLegMesh);
        this.contentGroup.add(this.rightLeg);

        // 4. Arms
        const armGeom = this.createSkinBoxGeometry(4, 12, 4, 40, 16);
        const armY = 22 * this.PX;

        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-6 * this.PX, armY, 0);
        const leftArmMesh = new THREE.Mesh(armGeom, material);
        leftArmMesh.position.y = -4 * this.PX;
        this.leftArm.add(leftArmMesh);
        this.contentGroup.add(this.leftArm);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(6 * this.PX, armY, 0);
        const rightArmMesh = new THREE.Mesh(armGeom, material);
        rightArmMesh.position.y = -4 * this.PX;
        this.rightArm.add(rightArmMesh);
        this.contentGroup.add(this.rightArm);
    }

    // ... createSkinBoxGeometry method remains the same ...
    private createSkinBoxGeometry(w: number, h: number, d: number, sx: number, sy: number): THREE.BoxGeometry {
        const geom = new THREE.BoxGeometry(w * this.PX, h * this.PX, d * this.PX);
        const uvs = geom.attributes.uv.array as Float32Array;

        const ATLAS_SIZE = 256;
        const SKIN_X = 8 * 16;
        const SKIN_Y = 0;
        
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

        setFaceUV(0, sx + d + w, sy + d, d, h);      // Right
        setFaceUV(1, sx, sy + d, d, h);              // Left
        setFaceUV(2, sx + d, sy, w, d);              // Top
        setFaceUV(3, sx + d + w, sy, w, d);          // Bottom
        setFaceUV(4, sx + d, sy + d, w, h);          // Front
        setFaceUV(5, sx + d + w + d, sy + d, w, h);  // Back

        return geom;
    }

    public updateAnimation(walkTime: number, isMoving: boolean, headPitch: number = 0) {
        this.headGroup.rotation.x = headPitch;

        if (isMoving) {
            const angle = Math.sin(walkTime * 10) * 0.5;
            this.leftArm.rotation.x = angle;
            this.rightArm.rotation.x = -angle;
            this.leftLeg.rotation.x = -angle;
            this.rightLeg.rotation.x = angle;
            
            // Body bobbing (只作用于内部 group，不干扰根节点的 Y 轴定位)
            this.contentGroup.position.y = Math.abs(Math.cos(walkTime * 10)) * 0.05;
        } else {
            const lerp = 0.1;
            this.leftArm.rotation.x += (0 - this.leftArm.rotation.x) * lerp;
            this.rightArm.rotation.x += (0 - this.rightArm.rotation.x) * lerp;
            this.leftLeg.rotation.x += (0 - this.leftLeg.rotation.x) * lerp;
            this.rightLeg.rotation.x += (0 - this.rightLeg.rotation.x) * lerp;
            this.contentGroup.position.y *= (1 - lerp);

            const breath = Math.sin(Date.now() * 0.002) * 0.02;
            this.headGroup.position.y = 24 * this.PX + breath;
        }
    }
}
