import * as THREE from 'three';
import { DroppedItem } from './DroppedItem';
import { World } from './World';
import { BlockType } from './Block';
import { TextureManager } from '../core/TextureManager';
import { Inventory } from '../player/Inventory';
import { AudioManager } from '../core/AudioManager';
import { Entity } from '../entity/Entity';
import { Pig, PigTraits } from '../entity/Pig';

export class EntityManager {
    private droppedItems: DroppedItem[] = [];
    private entities: Entity[] = [];
    private scene: THREE.Scene;
    private world: World;
    private textureAtlas: THREE.Texture | null = null;
    private audioManager: AudioManager;
    private raycaster = new THREE.Raycaster();

    constructor(scene: THREE.Scene, world: World, audioManager: AudioManager) {
        this.scene = scene;
        this.world = world;
        this.audioManager = audioManager;
        
        // Use the common texture from TextureManager
        this.textureAtlas = TextureManager.getMaterial().map;
    }

    public intersectEntities(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): Entity | null {
        this.raycaster.set(origin, direction);
        this.raycaster.far = maxDistance;

        // Collect all entity meshes and ensure their matrices are up to date
        const meshes: THREE.Object3D[] = [];
        for (const entity of this.entities) {
            entity.mesh.updateMatrixWorld(true);
            meshes.push(entity.mesh);
        }

        const intersects = this.raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            // Find which entity owns this mesh
            const hitMesh = intersects[0].object;
            return this.entities.find(e => {
                let found = false;
                e.mesh.traverse(obj => {
                    if (obj === hitMesh) found = true;
                });
                return found;
            }) || null;
        }
        return null;
    }

    public spawnPig(x: number, y: number, z: number, traits?: PigTraits) {
        const pig = new Pig(x, y, z, traits);
        this.entities.push(pig);
        this.scene.add(pig.mesh);
        return pig;
    }

    public spawnDrop(type: BlockType, position: THREE.Vector3) {
        if (type === BlockType.AIR || !this.textureAtlas) return;
        
        const drop = new DroppedItem(type, position, this.textureAtlas);
        this.droppedItems.push(drop);
        this.scene.add(drop.mesh);
    }

    public update(delta: number, playerPosition: THREE.Vector3, inventory: Inventory) {
        // Check if player is holding pig food (carrot)
        const selected = inventory.getSelectedSlot();
        const isHoldingPigFood = selected ? selected.type === BlockType.CARROT : false;

        // Update generic entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            if (entity instanceof Pig) {
                entity.update(delta, this.world, playerPosition, isHoldingPigFood);
            } else {
                entity.update(delta, this.world);
            }
        }

        // Handle breeding
        this.handleBreeding();

        // Update dropped items
        for (let i = this.droppedItems.length - 1; i >= 0; i--) {
            const item = this.droppedItems[i];
            const alive = item.update(delta, this.world);
            
            if (!alive) {
                this.removeDrop(i);
                continue;
            }

            if (item.canBePickedUp(playerPosition)) {
                const remaining = inventory.addItem(item.type, 1);
                if (remaining === 0) {
                    this.audioManager.play('place'); 
                    this.removeDrop(i);
                }
            }
        }
    }

    private handleBreeding() {
        const pigsInLove = this.entities.filter(e => e instanceof Pig && (e as Pig).loveTimer > 0) as Pig[];
        
        for (let i = 0; i < pigsInLove.length; i++) {
            for (let j = i + 1; j < pigsInLove.length; j++) {
                const p1 = pigsInLove[i];
                const p2 = pigsInLove[j];

                if (p1.position.distanceTo(p2.position) < 2.0) {
                    this.breed(p1, p2);
                }
            }
        }
    }

    private breed(p1: Pig, p2: Pig) {
        // Reset love timers and start cooldown
        p1.loveTimer = 0;
        p2.loveTimer = 0;
        p1.breedingCooldown = 300; // 5 minutes cooldown
        p2.breedingCooldown = 300;

        // Create child traits (Inheritance)
        const childTraits: PigTraits = {
            color: new THREE.Color().addColors(p1.traits.color, p2.traits.color).multiplyScalar(0.5),
            scale: (p1.traits.scale + p2.traits.scale) / 2,
            speedMultiplier: (p1.traits.speedMultiplier + p2.traits.speedMultiplier) / 2,
            isBaby: true
        };

        // Apply mutation (10% chance)
        if (Math.random() < 0.1) {
            childTraits.color.offsetHSL(Math.random() * 0.1 - 0.05, 0, 0);
            childTraits.scale *= 0.9 + Math.random() * 0.2;
        }

        // Spawn child
        this.spawnPig(p1.position.x, p1.position.y, p1.position.z, childTraits);
        this.audioManager.play('place'); 
    }

    private removeDrop(index: number) {
        const item = this.droppedItems[index];
        this.scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        if (Array.isArray(item.mesh.material)) {
            item.mesh.material.forEach(m => m.dispose());
        } else {
            item.mesh.material.dispose();
        }
        this.droppedItems.splice(index, 1);
    }
}
