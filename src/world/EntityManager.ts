import * as THREE from 'three';
import { DroppedItem } from './DroppedItem';
import { World } from './World';
import { BlockType } from './Block';
import { TextureManager } from '../core/TextureManager';
import { Inventory } from '../player/Inventory';
import { AudioManager } from '../core/AudioManager';
import { Entity } from '../entity/Entity';
import { Pig } from '../entity/Pig';

export class EntityManager {
    private droppedItems: DroppedItem[] = [];
    private entities: Entity[] = [];
    private scene: THREE.Scene;
    private world: World;
    private textureAtlas: THREE.Texture | null = null;
    private audioManager: AudioManager;

    constructor(scene: THREE.Scene, world: World, audioManager: AudioManager) {
        this.scene = scene;
        this.world = world;
        this.audioManager = audioManager;
        
        // Use the common texture from TextureManager
        this.textureAtlas = TextureManager.getMaterial().map;
    }

    public spawnPig(x: number, y: number, z: number) {
        const pig = new Pig(x, y, z);
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
        // Update generic entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            this.entities[i].update(delta, this.world);
        }

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
                    this.audioManager.play('place'); // Use a pickup sound if available, reusing 'place' for now
                    this.removeDrop(i);
                }
            }
        }
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
