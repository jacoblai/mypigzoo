import * as THREE from 'three';
import { Entity } from './Entity';
import { World } from '../world/World';
import { Physics } from '../utils/Physics';

export enum AnimalState {
    IDLE,
    WANDER,
}

export abstract class Animal extends Entity {
    protected state: AnimalState = AnimalState.IDLE;
    protected stateTimer: number = 0;
    protected moveSpeed: number = 2.0;
    protected targetRotation: number = 0;
    
    // Physical dimensions for collision
    protected abstract width: number;
    protected abstract height: number;

    constructor(x: number, y: number, z: number) {
        super(x, y, z);
        this.targetRotation = Math.random() * Math.PI * 2;
        this.rotation.y = this.targetRotation;
    }

    public update(delta: number, world: World): void {
        this.updateAI(delta);
        this.applyPhysics(delta, world);
        this.updateMesh();
    }

    protected updateAI(delta: number): void {
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
            // Switch state
            if (this.state === AnimalState.IDLE) {
                this.state = AnimalState.WANDER;
                this.stateTimer = 2 + Math.random() * 3;
                this.targetRotation = Math.random() * Math.PI * 2;
            } else {
                this.state = AnimalState.IDLE;
                this.stateTimer = 1 + Math.random() * 2;
            }
        }

        // Apply movement based on state
        if (this.state === AnimalState.WANDER) {
            // Smoothly rotate towards target
            let angleDiff = this.targetRotation - this.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.rotation.y += angleDiff * delta * 2;

            const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
            this.velocity.x = dir.x * this.moveSpeed;
            this.velocity.z = dir.z * this.moveSpeed;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
    }

    protected applyPhysics(delta: number, world: World): void {
        // Gravity
        this.velocity.y -= 25.0 * delta;

        // Collision
        const result = Physics.collide(world, this.position, this.velocity, delta, this.width / 2, this.height);
        
        // Step up logic (auto jump for animals)
        if (result.isGrounded && this.state === AnimalState.WANDER) {
            const isBlocked = (Math.abs(this.velocity.x) > 0.1 && Math.abs(result.velocity.x) < 0.01) ||
                              (Math.abs(this.velocity.z) > 0.1 && Math.abs(result.velocity.z) < 0.01);
            
            if (isBlocked) {
                const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
                const checkX = this.position.x + forward.x * 0.6;
                const checkZ = this.position.z + forward.z * 0.6;
                const blockY = world.getHighestSolidBlock(checkX, checkZ, Math.floor(this.position.y + 1));
                
                if (blockY <= this.position.y + 1.1) { // Can jump up 1 block
                    result.velocity.y = 8.5; 
                }
            }
        }

        this.position.copy(result.position);
        this.velocity.copy(result.velocity);
    }

    protected updateMesh(): void {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
        }
    }
}
