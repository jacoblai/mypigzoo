import * as THREE from 'three';
import { World } from '../world/World';
import { BlockType, BLOCK_DATA } from '../world/Block';

export interface PhysicsResult {
    position: THREE.Vector3;
    isGrounded: boolean;
    velocity: THREE.Vector3;
}

export class Physics {
    public static readonly PLAYER_RADIUS = 0.35;
    public static readonly PLAYER_HEIGHT = 2.0;
    public static readonly EYE_HEIGHT = 1.625; // 26 pixels high
    private static readonly EPSILON = 0.001;

    public static collide(world: World, position: THREE.Vector3, velocity: THREE.Vector3, delta: number): PhysicsResult {
        const nextPos = position.clone();
        const finalVelocity = velocity.clone();
        let isGrounded = false;

        // 分轴处理，这是消除抖动的核心设计
        
        // 1. Y 轴 (处理重力和跳跃)
        const stepY = velocity.y * delta;
        nextPos.y += stepY;
        if (this.isColliding(world, nextPos)) {
            if (stepY < 0) { // 落地
                nextPos.y = Math.ceil(nextPos.y) + this.EPSILON;
                isGrounded = true;
            } else { // 撞顶
                nextPos.y = Math.floor(nextPos.y + this.PLAYER_HEIGHT) - this.PLAYER_HEIGHT - this.EPSILON;
            }
            finalVelocity.y = 0;
        }

        // 2. X 轴
        const stepX = velocity.x * delta;
        nextPos.x += stepX;
        if (this.isColliding(world, nextPos)) {
            nextPos.x = position.x;
            finalVelocity.x = 0;
        }

        // 3. Z 轴
        const stepZ = velocity.z * delta;
        nextPos.z += stepZ;
        if (this.isColliding(world, nextPos)) {
            nextPos.z = position.z;
            finalVelocity.z = 0;
        }

        return {
            position: nextPos,
            isGrounded,
            velocity: finalVelocity
        };
    }

    private static isColliding(world: World, pos: THREE.Vector3): boolean {
        const r = this.PLAYER_RADIUS;
        const h = this.PLAYER_HEIGHT;
        
        // 检查 8 个顶点以确保全包围盒碰撞
        const offsets = [
            [r, 0, r], [r, 0, -r], [-r, 0, r], [-r, 0, -r],
            [r, h, r], [r, h, -r], [-r, h, r], [-r, h, -r],
            [r, h/2, r], [-r, h/2, -r] // 增加腰部检测更稳健
        ];

        for (const [ox, oy, oz] of offsets) {
            const voxel = world.getVoxel(pos.x + ox, pos.y + oy, pos.z + oz);
            if (voxel !== BlockType.AIR) {
                const blockData = BLOCK_DATA[voxel];
                if (blockData && blockData.isSolid) {
                    return true;
                }
            }
        }
        return false;
    }
}
