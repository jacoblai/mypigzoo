import * as THREE from 'three';
import { BlockType, BLOCK_DATA, RenderType } from './Block';
import { World } from './World';

export class DroppedItem {
    public mesh: THREE.Sprite;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public type: BlockType;
    public spawnTime: number;
    
    private static readonly SCALE = 0.5;
    private static readonly ROTATE_SPEED = 1.0;
    private static readonly BOB_AMPLITUDE = 0.04;
    private static readonly BOB_SPEED = 2.5;
    private static readonly LIFETIME = 300000; // 5 minutes in ms
    private static readonly PICKUP_RANGE = 1.5;

    constructor(type: BlockType, position: THREE.Vector3, textureAtlas: THREE.Texture) {
        this.type = type;
        this.position = position.clone();
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            4,
            (Math.random() - 0.5) * 2
        );
        this.spawnTime = Date.now();

        const material = this.createItemMaterial(type, textureAtlas);
        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(DroppedItem.SCALE, DroppedItem.SCALE, DroppedItem.SCALE);
        this.mesh.position.copy(this.position);
    }

    private createItemMaterial(type: BlockType, texture: THREE.Texture): THREE.SpriteMaterial {
        const texData = BLOCK_DATA[type];
        if (!texData) return new THREE.SpriteMaterial({ color: 0xff00ff });

        const uv = texData.textures.side || texData.textures.all || texData.textures.top || texData.textures.bottom || [0, 0];

        const tileSize = 1 / 16;
        const pad = 0.001;
        const size = tileSize - pad * 2;

        const itemTex = texture.clone();
        itemTex.matrixAutoUpdate = true;
        itemTex.repeat.set(size, size);
        itemTex.offset.set(uv[0] * tileSize + pad, 1 - (uv[1] + 1) * tileSize + pad);
        itemTex.wrapS = THREE.ClampToEdgeWrapping;
        itemTex.wrapT = THREE.ClampToEdgeWrapping;
        itemTex.generateMipmaps = false;
        itemTex.minFilter = THREE.NearestFilter;
        itemTex.magFilter = THREE.NearestFilter;
        itemTex.needsUpdate = true;

        const material = new THREE.SpriteMaterial({
            map: itemTex,
            transparent: true,
            alphaTest: 0.1
        });

        if (type === BlockType.GLASS || texData.renderType === RenderType.TRANSPARENT) {
            material.opacity = 0.6;
            material.depthWrite = false;
        }

        return material;
    }

    public update(delta: number, world: World): boolean {
        const now = Date.now();
        if (now - this.spawnTime > DroppedItem.LIFETIME) return false;

        // Simple physics
        this.velocity.y -= 15 * delta;
        
        const nextPos = this.position.clone().add(this.velocity.clone().multiplyScalar(delta));
        
        // Collision with world (floor only for simplicity)
        const blockBelow = world.getVoxel(nextPos.x, nextPos.y - DroppedItem.SCALE/2, nextPos.z);
        if (blockBelow !== BlockType.AIR) {
            this.velocity.y = 0;
            this.velocity.x *= 0.9;
            this.velocity.z *= 0.9;
            nextPos.y = Math.floor(nextPos.y) + 1 + DroppedItem.SCALE/2;
        }

        this.position.copy(nextPos);
        this.mesh.position.copy(this.position);
        
        // Animation: Rotation and Bobbing
        this.mesh.rotation.z += delta * DroppedItem.ROTATE_SPEED;
        this.mesh.position.y += Math.sin(now / 1000 * DroppedItem.BOB_SPEED) * DroppedItem.BOB_AMPLITUDE;

        return true;
    }

    public canBePickedUp(playerPosition: THREE.Vector3): boolean {
        return this.position.distanceTo(playerPosition) < DroppedItem.PICKUP_RANGE;
    }
}
