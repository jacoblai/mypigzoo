import * as THREE from 'three';
import { BlockType, BLOCK_TEXTURES } from './Block';
import { World } from './World';

export class DroppedItem {
    public mesh: THREE.Mesh;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public type: BlockType;
    public spawnTime: number;
    
    private static readonly SCALE = 0.25;
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

        // Create a small block mesh
        const geometry = new THREE.BoxGeometry(DroppedItem.SCALE, DroppedItem.SCALE, DroppedItem.SCALE);
        
        // Setup materials based on BlockType (using the same logic as MeshBuilder but simplified for a single cube)
        const materials = this.createMaterials(type, textureAtlas);
        this.mesh = new THREE.Mesh(geometry, materials);
        this.mesh.position.copy(this.position);
    }

    private createMaterials(type: BlockType, texture: THREE.Texture): THREE.Material[] {
        const texData = BLOCK_TEXTURES[type];
        if (!texData) return [new THREE.MeshStandardMaterial({ color: 0xff00ff })];

        const faces = ['right', 'left', 'top', 'bottom', 'front', 'back'];
        return faces.map(face => {
            let uv: [number, number];
            if (face === 'top' && texData.top) uv = texData.top;
            else if (face === 'bottom' && texData.bottom) uv = texData.bottom;
            else if (texData.side) uv = texData.side;
            else uv = texData.all || [0, 0];

            const faceTex = texture.clone();
            faceTex.matrixAutoUpdate = false;
            faceTex.repeat.set(1/16, 1/16);
            faceTex.offset.set(uv[0] / 16, 1 - (uv[1] + 1) / 16);
            faceTex.needsUpdate = true;

            return new THREE.MeshStandardMaterial({ map: faceTex });
        });
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
        this.mesh.rotation.y += delta * 2;
        this.mesh.position.y += Math.sin(now / 500) * 0.05;

        return true;
    }

    public canBePickedUp(playerPosition: THREE.Vector3): boolean {
        return this.position.distanceTo(playerPosition) < DroppedItem.PICKUP_RANGE;
    }
}
