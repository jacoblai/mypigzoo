import * as THREE from 'three';
import { Animal, AnimalState } from './Animal';
import { PigModel } from './PigModel';
import { World } from '../world/World';

export interface PigTraits {
    color: THREE.Color;
    scale: number;
    speedMultiplier: number;
    isBaby: boolean;
}

export class Pig extends Animal {
    public mesh: THREE.Group;
    private model: PigModel;
    private walkTime: number = 0;
    public traits: PigTraits;

    // Use smaller collision box to prevent getting stuck
    protected width = 0.6;
    protected height = 0.8;

    constructor(x: number, y: number, z: number, traits?: PigTraits) {
        super(x, y, z);
        this.model = new PigModel();
        this.mesh = this.model.group;
        
        // Initialize traits
        if (traits) {
            this.traits = traits;
        } else {
            // Random traits for wild pigs
            this.traits = {
                color: new THREE.Color(1, 0.9 + Math.random() * 0.1, 0.9 + Math.random() * 0.1),
                scale: 0.8 + Math.random() * 0.4,
                speedMultiplier: 0.8 + Math.random() * 0.4,
                isBaby: false
            };
        }

        this.applyTraits();
    }

    private applyTraits() {
        this.moveSpeed = 1.5 * this.traits.speedMultiplier;
        const finalScale = this.traits.isBaby ? this.traits.scale * 0.5 : this.traits.scale;
        this.model.applyTraits(this.traits.color, finalScale);
        
        // Update collision box based on scale
        this.width = 0.9 * finalScale;
        this.height = 0.9 * finalScale;
    }

    public feed(): boolean {
        if (this.traits.isBaby) {
            // Speed up growth
            return true;
        }

        if (this.breedingCooldown <= 0 && this.loveTimer <= 0) {
            this.loveTimer = 30; // 30 seconds of love
            this.state = AnimalState.LOVE;
            // TODO: Particle effect
            return true;
        }

        return false;
    }

    public update(delta: number, world: World, playerPos?: THREE.Vector3, isHoldingFood?: boolean): void {
        super.update(delta, world, playerPos, isHoldingFood);
        
        // Growth logic
        if (this.traits.isBaby) {
            // ...
            if (this.traits.scale < 1.0) {
                // Growth takes 20 minutes in MC, let's make it 2 minutes for testing/demo
                const growthRate = 1 / 120; 
                this.traits.scale += growthRate * delta;
                if (this.traits.scale >= 1.0) {
                    this.traits.scale = 1.0;
                    this.traits.isBaby = false;
                }
                this.applyTraits();
            }
        }
        
        const isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1;
        if (isMoving) {
            this.walkTime += delta;
        } else {
            this.walkTime = 0;
        }

        this.model.updateAnimation(delta, this.walkTime, isMoving, this.loveTimer > 0);
    }
}
