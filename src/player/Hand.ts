import * as THREE from 'three';
import { BlockType } from '../world/Block';
import { TextureManager } from '../core/TextureManager';
import { MeshBuilder } from '../world/MeshBuilder';

export class Hand {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private blockMesh: THREE.Mesh | null = null;
    private armMesh: THREE.Mesh;
    private group: THREE.Group;
    private swingGroup: THREE.Group;

    private swingT = 0;
    private isSwinging = false;

    constructor() {
        this.scene = new THREE.Scene();
        // 降低 FOV 让手部看起来更修长
        this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 10);
        this.camera.position.set(0, 0, 3);

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.swingGroup = new THREE.Group();
        this.group.add(this.swingGroup);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight.position.set(2, 2, 2);
        this.scene.add(dirLight);

        // 1. 创建手臂 (使用与 CharacterModel 一致的 4x4x12 像素比例)
        const PX = 1 / 16;
        const armGeom = new THREE.BoxGeometry(4 * PX, 4 * PX, 12 * PX);
        
        // 为手臂设置 UV 坐标，匹配 Steve 皮肤中的手臂位置 (40, 16)
        const uvs = armGeom.attributes.uv.array as Float32Array;
        const ATLAS_SIZE = 256;
        const SKIN_X = 8 * 16;
        const SKIN_Y = 0;
        const sx = 40; 
        const sy = 16;
        const w = 4; const h = 12; const d = 4;

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

        // Arms: Top(44,16), Bottom(48,16), Right(40,20), Front(44,20), Left(48,20), Back(52,20)
        setFaceUV(0, sx + d + w, sy + d, d, h);      // Right
        setFaceUV(1, sx, sy + d, d, h);              // Left
        setFaceUV(2, sx + d, sy, w, d);              // Top
        setFaceUV(3, sx + d + w, sy, w, d);          // Bottom
        setFaceUV(4, sx + d, sy + d, w, h);          // Front
        setFaceUV(5, sx + d + w + d, sy + d, w, h);  // Back

        this.armMesh = new THREE.Mesh(armGeom, TextureManager.getMaterial());
        // 将手臂中心向后移，使其看起来是从相机下方伸出的
        // 旋转手臂，使其长轴沿 Z 轴
        this.armMesh.rotation.x = Math.PI / 2;
        this.armMesh.position.set(0, 0, -0.3); 
        this.swingGroup.add(this.armMesh);

        // 2. 调整整个手部的初始姿态
        this.group.position.set(0.8, -0.6, 1.8);
        this.group.rotation.set(-0.1, -0.3, 0.1); 
    }

    public setBlock(type: BlockType) {
        if (this.blockMesh) {
            this.swingGroup.remove(this.blockMesh);
            this.blockMesh.geometry.dispose();
            this.blockMesh = null;
        }

        if (type === BlockType.AIR) return;

        const data = new Uint8Array([type]);
        const geometry = MeshBuilder.generateChunkMesh(1, data, (x, y, z) => (x === 0 && y === 0 && z === 0 ? type : 0));
        
        this.blockMesh = new THREE.Mesh(geometry, TextureManager.getMaterial());
        this.blockMesh.scale.set(0.3, 0.3, 0.3);
        // 放置在手臂末端
        this.blockMesh.position.set(0, 0.1, -1.0);
        // 给方块一个自然的旋转角
        this.blockMesh.rotation.set(0, Math.PI / 4, 0);
        this.swingGroup.add(this.blockMesh);
    }

    public swing() {
        if (this.isSwinging) return;
        this.isSwinging = true;
        this.swingT = 0;
    }

    public rotate() {
        if (this.blockMesh) {
            this.blockMesh.rotation.y += Math.PI / 2;
        }
    }

    public update(delta: number, isMoving: boolean) {
        const time = Date.now() * 0.002;
        
        // 1. Idle/Walk 呼吸感与晃动
        let bobX = 0;
        let bobY = 0;
        if (isMoving) {
            bobX = Math.cos(time * 6) * 0.03;
            bobY = Math.sin(time * 12) * 0.03;
        } else {
            bobY = Math.sin(time * 2) * 0.01;
        }
        this.group.position.x = 0.9 + bobX;
        this.group.position.y = -0.7 + bobY;

        // 2. 挥动动画优化：更符合物理抛物线
        if (this.isSwinging) {
            this.swingT += delta * 12;
            if (this.swingT > Math.PI) {
                this.swingT = 0;
                this.isSwinging = false;
            }
            this.swingGroup.rotation.x = -Math.sin(this.swingT) * 1.0;
            this.swingGroup.rotation.y = Math.sin(this.swingT) * 0.5;
        } else {
            this.swingGroup.rotation.x *= 0.8;
            this.swingGroup.rotation.y *= 0.8;
        }
    }

    public render(renderer: THREE.WebGLRenderer) {
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(this.scene, this.camera);
    }

    public onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
