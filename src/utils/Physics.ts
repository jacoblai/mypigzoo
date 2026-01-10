import * as THREE from 'three';
import { World } from '../world/World';

export interface CollisionResult {
    position: THREE.Vector3;
    isGrounded: boolean;
}

export class Physics {
    public static readonly PLAYER_RADIUS = 0.3;
    public static readonly PLAYER_HEIGHT = 1.8;
    public static readonly EYE_HEIGHT = 1.6;
    private static readonly EPSILON = 0.005; // 稍微加大的容差

    /**
     * 稳定的物理碰撞决议
     */
    public static collide(world: World, position: THREE.Vector3, velocity: THREE.Vector3, delta: number): CollisionResult {
        const nextPos = position.clone();
        const step = velocity.clone().multiplyScalar(delta);
        let isGrounded = false;

        // --- 1. X 轴 ---
        if (Math.abs(step.x) > 0) {
            nextPos.x += step.x;
            if (this.isColliding(world, nextPos)) {
                nextPos.x = position.x;
            }
        }

        // --- 2. Z 轴 ---
        if (Math.abs(step.z) > 0) {
            nextPos.z += step.z;
            if (this.isColliding(world, nextPos)) {
                nextPos.z = position.z;
            }
        }

        // --- 3. Y 轴 (修复震动的核心) ---
        if (Math.abs(step.y) > 0) {
            nextPos.y += step.y;
            if (this.isColliding(world, nextPos)) {
                if (step.y < 0) { 
                    // 落地：对齐到方块顶部，并额外增加一个微小的悬浮值
                    nextPos.y = Math.ceil(nextPos.y - this.EPSILON) + this.EPSILON;
                    isGrounded = true;
                } else { 
                    // 撞头：对齐到方块底部，稍微向下偏移
                    nextPos.y = Math.floor(nextPos.y + this.PLAYER_HEIGHT + this.EPSILON) - this.PLAYER_HEIGHT - this.EPSILON;
                }
                velocity.y = 0;
            }
        } else {
            // 静止状态下的地面检查（防止悬空震动）
            if (this.isColliding(world, nextPos.clone().setY(nextPos.y - this.EPSILON))) {
                isGrounded = true;
                velocity.y = 0;
            }
        }

        return { position: nextPos, isGrounded };
    }

    private static isColliding(world: World, pos: THREE.Vector3): boolean {
        const r = this.PLAYER_RADIUS;
        const h = this.PLAYER_HEIGHT;

        // 核心修复：y 轴检测点包含绝对底部 (0) 和 绝对顶部 (h)
        const yCheck = [0, h / 2, h];
        const xCheck = [-r, r];
        const zCheck = [-r, r];

        for (const dy of yCheck) {
            for (const dx of xCheck) {
                for (const dz of zCheck) {
                    if (world.getVoxel(pos.x + dx, pos.y + dy, pos.z + dz) !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
