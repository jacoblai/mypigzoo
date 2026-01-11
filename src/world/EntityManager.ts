import * as THREE from 'three';
import { DroppedItem } from './DroppedItem';
import { World } from './World';
import { BlockType } from './Block';
import { TextureManager } from '../core/TextureManager';
import { Inventory } from '../player/Inventory';
import { AudioManager } from '../core/AudioManager';

export class EntityManager {
    private droppedItems: DroppedItem[] = [];
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

    public spawnDrop(type: BlockType, position: THREE.Vector3) {
        if (type === BlockType.AIR || !this.textureAtlas) return;
        
        const drop = new DroppedItem(type, position, this.textureAtlas);
        this.droppedItems.push(drop);
        this.scene.add(drop.mesh);
    }

    public update(delta: number, playerPosition: THREE.Vector3, inventory: Inventory) {
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
