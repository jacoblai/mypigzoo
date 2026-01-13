import * as THREE from 'three';
import { Animal } from './Animal';
import { PigModel } from './PigModel';
import { World } from '../world/World';

export class Pig extends Animal {
    public mesh: THREE.Group;
    private model: PigModel;
    private walkTime: number = 0;

    protected width = 0.9;
    protected height = 0.9;

    constructor(x: number, y: number, z: number) {
        super(x, y, z);
        this.model = new PigModel();
        this.mesh = this.model.group;
        this.moveSpeed = 1.5;
    }

    public update(delta: number, world: World): void {
        super.update(delta, world);
        
        const isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1;
        if (isMoving) {
            this.walkTime += delta;
        } else {
            this.walkTime = 0;
        }

        this.model.updateAnimation(delta, this.walkTime, isMoving);
    }
}
