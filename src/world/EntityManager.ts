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
    private camera: THREE.Camera;
    private raycaster = new THREE.Raycaster();
    private damageHearts: { mesh: THREE.Mesh, life: number }[] = [];

    constructor(scene: THREE.Scene, world: World, audioManager: AudioManager, camera: THREE.Camera) {
        this.scene = scene;
        this.world = world;
        this.audioManager = audioManager;
        this.camera = camera;
        
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
            // Find which entity owns this mesh using userData link
            let obj: THREE.Object3D | null = intersects[0].object;
            while (obj) {
                if (obj.userData.entity) return obj.userData.entity;
                obj = obj.parent;
            }
        }
        return null;
    }

    public spawnPig(x: number, y: number, z: number, traits?: PigTraits) {
        const pig = new Pig(x, y, z, traits);
        this.entities.push(pig);
        this.scene.add(pig.mesh);
        
        // Link meshes to entity for faster lookup
        pig.mesh.traverse(obj => {
            obj.userData.entity = pig;
        });
        
        // Set damage callback
        pig.onDamage = (amount, pos) => {
            this.spawnDamageHeart(pig.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
        };
        
        return pig;
    }

    public spawnDrop(type: BlockType, position: THREE.Vector3) {
        if (type === BlockType.AIR || !this.textureAtlas) return;
        
        const drop = new DroppedItem(type, position, this.textureAtlas);
        this.droppedItems.push(drop);
        this.scene.add(drop.mesh);
    }

    public spawnDamageHeart(position: THREE.Vector3) {
        const heartGeom = new THREE.PlaneGeometry(0.4, 0.4);
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        
        // Draw a simple Minecraft-style red heart
        ctx.fillStyle = '#ff0000';
        // Left lobe
        ctx.fillRect(8, 16, 24, 24);
        // Right lobe
        ctx.fillRect(32, 16, 24, 24);
        // Bottom part
        ctx.fillRect(16, 40, 32, 8);
        ctx.fillRect(24, 48, 16, 8);
        // Top rounding
        ctx.clearRect(8, 16, 8, 8);
        ctx.clearRect(48, 16, 8, 8);
        ctx.clearRect(24, 16, 16, 8);

        const texture = new THREE.CanvasTexture(canvas);
        const heartMat = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true, 
            side: THREE.DoubleSide,
            depthTest: false // Ensure it's always visible over the entity
        });

        const heart = new THREE.Mesh(heartGeom, heartMat);
        heart.renderOrder = 999;
        heart.position.copy(position);
        // Initial billboard
        heart.quaternion.copy(this.camera.quaternion);
        
        this.scene.add(heart);
        this.damageHearts.push({ mesh: heart, life: 1.0 });
    }

    public update(delta: number, playerPosition: THREE.Vector3, inventory: Inventory) {
        // Check if player is holding pig food (carrot)
        const selected = inventory.getSelectedSlot();
        const isHoldingPigFood = selected ? selected.type === BlockType.CARROT : false;

        // Update damage hearts
        for (let i = this.damageHearts.length - 1; i >= 0; i--) {
            const heart = this.damageHearts[i];
            heart.life -= delta;
            
            // Float up
            heart.mesh.position.y += delta * 1.5;
            
            // Billboard effect: face camera
            heart.mesh.quaternion.copy(this.camera.quaternion);
            
            // Fade out
            if (heart.mesh.material instanceof THREE.MeshBasicMaterial) {
                heart.mesh.material.opacity = heart.life;
            }

            if (heart.life <= 0) {
                this.scene.remove(heart.mesh);
                heart.mesh.geometry.dispose();
                (heart.mesh.material as THREE.Material).dispose();
                this.damageHearts.splice(i, 1);
            }
        }

        // Update generic entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            
            if (entity.isDead) {
                // Spawn drops
                const drops = entity.getDrops();
                for (const drop of drops) {
                    for (let n = 0; n < drop.count; n++) {
                        // Offset each drop slightly
                        const offset = new THREE.Vector3(
                            (Math.random() - 0.5) * 0.5,
                            0.2,
                            (Math.random() - 0.5) * 0.5
                        );
                        this.spawnDrop(drop.type, entity.position.clone().add(offset));
                    }
                }

                entity.dispose();
                this.scene.remove(entity.mesh);
                this.entities.splice(i, 1);
                continue;
            }

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
