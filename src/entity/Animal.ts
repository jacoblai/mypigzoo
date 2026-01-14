import * as THREE from 'three';
import { Entity } from './Entity';
import { World } from '../world/World';
import { Physics } from '../utils/Physics';

export enum AnimalState {
    IDLE,
    WANDER,
    LOVE,
    FOLLOW,
}

export abstract class Animal extends Entity {
    protected state: AnimalState = AnimalState.IDLE;
    protected stateTimer: number = 0;
    protected moveSpeed: number = 2.0;
    protected targetRotation: number = 0;
    
    // Breeding status
    public loveTimer: number = 0;
    public breedingCooldown: number = 0;
    
    // Temptation
    protected isTempted: boolean = false;
    protected temptTarget: THREE.Vector3 | null = null;
    
    // Physical dimensions for collision
    protected abstract width: number;
    protected abstract height: number;

    constructor(x: number, y: number, z: number) {
        super(x, y, z);
        this.targetRotation = Math.random() * Math.PI * 2;
        this.rotation.y = this.targetRotation;
        this.stateTimer = 1 + Math.random() * 3; // Start with a random timer
        
        // Ensure mesh is at correct position immediately
        setTimeout(() => this.updateMesh(), 0);
    }

    public update(delta: number, world: World, playerPos?: THREE.Vector3, isHoldingFood?: boolean): void {
        if (this.breedingCooldown > 0) this.breedingCooldown -= delta;
        if (this.loveTimer > 0) {
            this.loveTimer -= delta;
            if (this.loveTimer <= 0) {
                this.state = AnimalState.IDLE;
                this.stateTimer = 0.5; // Quick transition after love
            }
        }

        this.updateAI(delta, playerPos, isHoldingFood);
        this.applyPhysics(delta, world);
        this.updateMesh();
    }

    protected updateAI(delta: number, playerPos?: THREE.Vector3, isHoldingFood?: boolean): void {
        // 1. Temptation logic (highest priority)
        if (playerPos && isHoldingFood) {
            const dist = this.position.distanceTo(playerPos);
            if (dist < 10) { // Increased detection range
                this.isTempted = true;
                this.temptTarget = playerPos;
                if (this.state !== AnimalState.LOVE) {
                    this.state = AnimalState.FOLLOW;
                }
            } else {
                if (this.state === AnimalState.FOLLOW) this.state = AnimalState.IDLE;
                this.isTempted = false;
            }
        } else {
            if (this.state === AnimalState.FOLLOW) this.state = AnimalState.IDLE;
            this.isTempted = false;
        }

        // 2. State-specific behavior
        if (this.state === AnimalState.FOLLOW && this.isTempted && this.temptTarget) {
            const dist = this.position.distanceTo(this.temptTarget);
            if (dist > 2.0) {
                // Look at player
                const dir = new THREE.Vector3().subVectors(this.temptTarget, this.position);
                this.targetRotation = Math.atan2(dir.x, dir.z);
                this.rotation.y = this.lerpAngle(this.rotation.y, this.targetRotation, delta * 6);

                const moveDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
                this.velocity.x = moveDir.x * this.moveSpeed * 1.8; // Faster when following
                this.velocity.z = moveDir.z * this.moveSpeed * 1.8;
                return;
            } else {
                this.velocity.x = 0;
                this.velocity.z = 0;
                // Still look at player even when close
                const dir = new THREE.Vector3().subVectors(this.temptTarget, this.position);
                this.targetRotation = Math.atan2(dir.x, dir.z);
                this.rotation.y = this.lerpAngle(this.rotation.y, this.targetRotation, delta * 6);
                return;
            }
        }

        if (this.state === AnimalState.LOVE) {
            this.velocity.x *= 0.2; // Slow down significantly
            this.velocity.z *= 0.2;
            return;
        }

        // 3. Wander logic
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
            if (this.state === AnimalState.WANDER) {
                this.state = AnimalState.IDLE;
                this.stateTimer = 1 + Math.random() * 2;
            } else {
                this.state = AnimalState.WANDER;
                this.stateTimer = 3 + Math.random() * 5; // Long wander
                this.targetRotation = Math.random() * Math.PI * 2;
            }
        }

        if (this.state === AnimalState.WANDER) {
            this.rotation.y = this.lerpAngle(this.rotation.y, this.targetRotation, delta * 3);
            const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
            this.velocity.x = dir.x * this.moveSpeed;
            this.velocity.z = dir.z * this.moveSpeed;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
    }

    private lerpAngle(current: number, target: number, t: number): number {
        let diff = target - current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return current + diff * Math.min(1, t);
    }

    protected applyPhysics(delta: number, world: World): void {
        // Gravity
        this.velocity.y -= 25.0 * delta;

        // Use a slightly smaller radius for collision than the visual width
        const radius = this.width * 0.4;
        const result = Physics.collide(world, this.position, this.velocity, delta, radius, this.height);
        
        // Auto jump (for both WANDER and FOLLOW)
        if (result.isGrounded && (this.state === AnimalState.WANDER || this.state === AnimalState.FOLLOW)) {
            const isBlocked = (Math.abs(this.velocity.x) > 0.1 && Math.abs(result.velocity.x) < 0.01) ||
                              (Math.abs(this.velocity.z) > 0.1 && Math.abs(result.velocity.z) < 0.01);
            
            if (isBlocked) {
                const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
                const checkX = this.position.x + forward.x * 0.7;
                const checkZ = this.position.z + forward.z * 0.7;
                const blockY = world.getHighestSolidBlock(checkX, checkZ, Math.floor(this.position.y + 1));
                
                if (blockY <= this.position.y + 1.1) { 
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
