import * as THREE from 'three';
import { World } from '../world/World';

export abstract class Entity {
    public position: THREE.Vector3 = new THREE.Vector3();
    public velocity: THREE.Vector3 = new THREE.Vector3();
    public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
    
    public abstract mesh: THREE.Object3D;
    
    constructor(x: number, y: number, z: number) {
        this.position.set(x, y, z);
    }

    protected updateMesh(): void {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
        }
    }

    public abstract update(delta: number, world: World, ...args: any[]): void;

    public dispose(): void {
        if (this.mesh) {
            this.mesh.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    }
}
