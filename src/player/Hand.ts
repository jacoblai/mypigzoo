import * as THREE from 'three';
import { BlockType } from '../world/Block';
import { TextureManager } from '../core/TextureManager';
import { MeshBuilder } from '../world/MeshBuilder';

export class Hand {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private mesh: THREE.Mesh | null = null;
    private group: THREE.Group;

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10);
        this.camera.position.set(0, 0, 5);

        this.group = new THREE.Group();
        this.scene.add(this.group);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 5, 5);
        this.scene.add(dirLight);

        // Position the group in the bottom right
        this.group.position.set(1.5, -1.2, 0);
        this.group.rotation.set(0.4, -0.4, 0);
    }

    public setBlock(type: BlockType) {
        if (this.mesh) {
            this.group.remove(this.mesh);
            this.mesh.geometry.dispose();
        }

        // Create a single voxel data for the hand display
        const data = new Uint8Array([type]);
        const geometry = MeshBuilder.generateChunkMesh(1, data, (x, y, z) => (x === 0 && y === 0 && z === 0 ? type : 0));
        
        this.mesh = new THREE.Mesh(geometry, TextureManager.getMaterial());
        // Center the 1x1x1 block
        this.mesh.position.set(-0.5, -0.5, -0.5);
        this.group.add(this.mesh);
    }

    public update(delta: number) {
        // Idle animation: subtle bobbing
        const time = Date.now() * 0.002;
        this.group.position.y = -1.2 + Math.sin(time) * 0.05;
        this.group.rotation.y = -0.4 + Math.cos(time * 0.5) * 0.05;
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
