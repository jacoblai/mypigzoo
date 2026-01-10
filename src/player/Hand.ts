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

        // 1. 创建手臂 (更符合比例的长方体)
        const armGeom = new THREE.BoxGeometry(0.35, 0.35, 1.0);
        
        // 为手臂设置 UV 坐标，强制指向皮肤色块 (4, 0)
        const uvs = armGeom.attributes.uv.array as Float32Array;
        const ATLAS_SIZE = 16;
        const u = 4 / ATLAS_SIZE;
        const v = 1 - (0 + 1) / ATLAS_SIZE;
        const size = 1 / ATLAS_SIZE;
        
        for (let i = 0; i < uvs.length; i += 2) {
            uvs[i] = u + (uvs[i] > 0.5 ? size : 0);
            uvs[i+1] = v + (uvs[i+1] > 0.5 ? size : 0);
        }

        this.armMesh = new THREE.Mesh(armGeom, TextureManager.getMaterial());
        // 将手臂中心向后移，使其看起来是从相机下方伸出的
        this.armMesh.position.set(0, 0, -0.5); 
        this.swingGroup.add(this.armMesh);

        // 2. 调整整个手部的初始姿态
        // 位于屏幕右下角，并带有一个向内的倾斜角
        this.group.position.set(0.9, -0.7, 1.5);
        this.group.rotation.set(-0.2, -0.4, 0.2); 
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
