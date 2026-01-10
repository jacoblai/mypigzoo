import * as THREE from 'three';
import { World } from '../world/World';
import { raycast } from '../utils/Raycaster';

export class SelectionBox {
    private mesh: THREE.LineSegments;
    private world: World;
    private camera: THREE.PerspectiveCamera;

    constructor(scene: THREE.Scene, world: World, camera: THREE.PerspectiveCamera) {
        this.world = world;
        this.camera = camera;

        const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        this.mesh = new THREE.LineSegments(edges, material);
        this.mesh.visible = false;
        scene.add(this.mesh);
    }

    public update() {
        const start = this.camera.position;
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        
        // Increased distance to 20 to ensure it hits the ground from height
        const hit = raycast(this.world, start, direction, 20);
        if (hit) {
            this.mesh.position.set(
                hit.position.x + 0.5,
                hit.position.y + 0.5,
                hit.position.z + 0.5
            );
            this.mesh.visible = true;
            return hit;
        } else {
            this.mesh.visible = false;
            return null;
        }
    }
}
