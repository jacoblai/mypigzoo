import * as THREE from 'three';
import { TextureManager } from '../core/TextureManager';

export class CharacterModel {
    public group: THREE.Group;
    
    // Model parts
    public head: THREE.Mesh;
    public torso: THREE.Mesh;
    public leftArm: THREE.Group;
    public rightArm: THREE.Group;
    public leftLeg: THREE.Group;
    public rightLeg: THREE.Group;

    constructor() {
        this.group = new THREE.Group();
        const material = TextureManager.getMaterial();

        // 基础比例定义 (总高度约 1.8)
        const legH = 0.75;
        const torsoH = 0.75;
        const headS = 0.5;

        // UV mapping helper
        const applyUV = (geom: THREE.BufferGeometry, tx: number, ty: number) => {
            const uvs = geom.attributes.uv.array as Float32Array;
            const ATLAS_SIZE = 16;
            const u = tx / ATLAS_SIZE;
            const v = 1 - (ty + 1) / ATLAS_SIZE;
            const size = 1 / ATLAS_SIZE;
            const pad = 0.001; // Avoid bleeding

            for (let i = 0; i < uvs.length; i += 2) {
                uvs[i] = u + (uvs[i] > 0.5 ? size - pad : pad);
                uvs[i+1] = v + (uvs[i+1] > 0.5 ? size - pad : pad);
            }
        };

        // 1. Legs (Bottom at 0, grows upwards) - Using Pants tile (6, 0)
        const legGeom = new THREE.BoxGeometry(0.2, legH, 0.2);
        applyUV(legGeom, 6, 0);
        
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.15, legH, 0); // Pivot at top of leg
        const leftLegMesh = new THREE.Mesh(legGeom, material);
        leftLegMesh.position.y = -legH / 2; 
        this.leftLeg.add(leftLegMesh);
        this.group.add(this.leftLeg);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.15, legH, 0);
        const rightLegMesh = new THREE.Mesh(legGeom, material);
        rightLegMesh.position.y = -legH / 2;
        this.rightLeg.add(rightLegMesh);
        this.group.add(this.rightLeg);

        // 2. Torso (Bottom at legH) - Using Clothes tile (5, 0)
        const torsoGeom = new THREE.BoxGeometry(0.5, torsoH, 0.25);
        applyUV(torsoGeom, 5, 0);
        this.torso = new THREE.Mesh(torsoGeom, material);
        this.torso.position.y = legH + torsoH / 2;
        this.group.add(this.torso);

        // 3. Head (Bottom at legH + torsoH) - Using Skin tile (4, 0)
        const headGeom = new THREE.BoxGeometry(headS, headS, headS);
        applyUV(headGeom, 4, 0);
        this.head = new THREE.Mesh(headGeom, material);
        this.head.position.y = legH + torsoH + headS / 2;
        this.group.add(this.head);

        // 4. Arms (Pivot at top sides of torso) - Using Skin tile (4, 0)
        const armGeom = new THREE.BoxGeometry(0.2, 0.75, 0.2);
        applyUV(armGeom, 4, 0);
        const armY = legH + torsoH - 0.1; 

        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.35, armY, 0);
        const leftArmMesh = new THREE.Mesh(armGeom, material);
        leftArmMesh.position.y = -0.3; 
        this.leftArm.add(leftArmMesh);
        this.group.add(this.leftArm);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.35, armY, 0);
        const rightArmMesh = new THREE.Mesh(armGeom, material);
        rightArmMesh.position.y = -0.3;
        this.rightArm.add(rightArmMesh);
        this.group.add(this.rightArm);
    }

    public updateAnimation(walkTime: number, isMoving: boolean) {
        if (isMoving) {
            const angle = Math.sin(walkTime * 10) * 0.5;
            this.leftArm.rotation.x = angle;
            this.rightArm.rotation.x = -angle;
            this.leftLeg.rotation.x = -angle;
            this.rightLeg.rotation.x = angle;
        } else {
            this.leftArm.rotation.x *= 0.9;
            this.rightArm.rotation.x *= 0.9;
            this.leftLeg.rotation.x *= 0.9;
            this.rightLeg.rotation.x *= 0.9;
        }
    }
}
