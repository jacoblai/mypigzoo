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

        // 1. Legs (底部在 0, 向上生长)
        const legGeom = new THREE.BoxGeometry(0.2, legH, 0.2);
        
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.15, legH, 0); // 关节在腿顶部
        const leftLegMesh = new THREE.Mesh(legGeom, material);
        leftLegMesh.position.y = -legH / 2; // 视觉重心下移
        this.leftLeg.add(leftLegMesh);
        this.group.add(this.leftLeg);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.15, legH, 0);
        const rightLegMesh = new THREE.Mesh(legGeom, material);
        rightLegMesh.position.y = -legH / 2;
        this.rightLeg.add(rightLegMesh);
        this.group.add(this.rightLeg);

        // 2. Torso (底部在 legH)
        const torsoGeom = new THREE.BoxGeometry(0.5, torsoH, 0.25);
        this.torso = new THREE.Mesh(torsoGeom, material);
        this.torso.position.y = legH + torsoH / 2;
        this.group.add(this.torso);

        // 3. Head (底部在 legH + torsoH)
        const headGeom = new THREE.BoxGeometry(headS, headS, headS);
        this.head = new THREE.Mesh(headGeom, material);
        this.head.position.y = legH + torsoH + headS / 2;
        this.group.add(this.head);

        // 4. Arms (关节在躯干顶部两侧)
        const armGeom = new THREE.BoxGeometry(0.2, 0.75, 0.2);
        const armY = legH + torsoH - 0.1; // 腋下位置

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
