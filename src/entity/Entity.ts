import * as THREE from 'three';
import { World } from '../world/World';

export abstract class Entity {
    public position: THREE.Vector3 = new THREE.Vector3();
    public velocity: THREE.Vector3 = new THREE.Vector3();
    public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
    
    public abstract mesh: THREE.Object3D;
    
    // Health system
    public maxHealth: number = 20;
    public health: number = 20;
    public isDead: boolean = false;
    public hurtTimer: number = 0;
    public onDamage?: (amount: number, attackerPos?: THREE.Vector3) => void;
    
    constructor(x: number, y: number, z: number) {
        this.position.set(x, y, z);
    }

    public takeDamage(amount: number, attackerPos?: THREE.Vector3): void {
        if (this.isDead) return;
        
        this.health = Math.max(0, this.health - amount);
        this.hurtTimer = 0.5; // Flash red for 0.5s

        if (attackerPos) {
            const dir = new THREE.Vector3().subVectors(this.position, attackerPos);
            dir.y = 0;
            dir.normalize();
            this.velocity.x += dir.x * 5.0;
            this.velocity.z += dir.z * 5.0;
        }

        if (this.onDamage) {
            this.onDamage(amount, attackerPos);
        }

        if (this.health <= 0) {
            this.die();
        }
    }

    protected die(): void {
        this.isDead = true;
    }

    protected updateMesh(): void {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
        }
    }

    public abstract update(delta: number, world: World, ...args: any[]): void;

    public getDrops(): { type: number, count: number }[] {
        return [];
    }

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
