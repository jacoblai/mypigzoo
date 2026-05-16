import * as THREE from 'three';
import { World } from '../world/World';
import { BlockType, BLOCK_DATA } from '../world/Block';

export interface PhysicsResult {
    position: THREE.Vector3;
    isGrounded: boolean;
    velocity: THREE.Vector3;
}

export class Physics {
    /** 与 Minecraft Java 玩家碰撞盒一致：宽 0.6（半宽 0.3）、高 1.8，可在 2 格净空隧道内通行 */
    public static readonly PLAYER_RADIUS = 0.3;
    public static readonly PLAYER_HEIGHT = 1.8;
    public static readonly EYE_HEIGHT = 1.62;
    /** 潜行：Java 原版约 1.5 高 / 视点约 1.27 */
    public static readonly PLAYER_SNEAK_HEIGHT = 1.5;
    public static readonly PLAYER_SNEAK_EYE_HEIGHT = 1.27;
    /** 相对行走时的水平速度倍数（原版约为 30%） */
    public static readonly PLAYER_SNEAK_MOVE_FACTOR = 0.3;

    static readonly EPSILON = 0.001;

    /** 脚底 feetY、身高 h 时，与竖直 AABB 相交的整数体素 Y 层（用于出生点、放置冲突等） */
    public static playerOccupiedBlockYs(feetY: number, height: number = Physics.PLAYER_HEIGHT): number[] {
        const top = feetY + height;
        const ys: number[] = [];
        let y = Math.floor(feetY);
        while (y < top - this.EPSILON) {
            ys.push(y);
            y++;
        }
        return ys;
    }

    public static collide(
        world: World,
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        delta: number,
        radius: number = Physics.PLAYER_RADIUS,
        height: number = Physics.PLAYER_HEIGHT
    ): PhysicsResult {
        const nextPos = position.clone();
        const finalVelocity = velocity.clone();
        let isGrounded = false;

        // 分轴处理，这是消除抖动的核心设计
        
        // 1. Y 轴 (处理重力和跳跃)
        const stepY = velocity.y * delta;
        nextPos.y += stepY;
        if (this.playerBodyColliding(world, nextPos, radius, height)) {
            if (stepY < 0) { // 落地
                nextPos.y = Math.ceil(nextPos.y) + this.EPSILON;
                isGrounded = true;
            } else { // 撞顶
                nextPos.y = Math.floor(nextPos.y + height) - height - this.EPSILON;
            }
            finalVelocity.y = 0;
        }

        // 2. X 轴
        const stepX = velocity.x * delta;
        nextPos.x += stepX;
        if (this.playerBodyColliding(world, nextPos, radius, height)) {
            nextPos.x = position.x;
            finalVelocity.x = 0;
        }

        // 3. Z 轴
        const stepZ = velocity.z * delta;
        nextPos.z += stepZ;
        if (this.playerBodyColliding(world, nextPos, radius, height)) {
            nextPos.z = position.z;
            finalVelocity.z = 0;
        }

        return {
            position: nextPos,
            isGrounded,
            velocity: finalVelocity
        };
    }

    public static playerBodyColliding(world: World, pos: THREE.Vector3, r: number, h: number): boolean {
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

    /**
     * 单柱：脚底正对下方一格是否为实体支撑（脚掌略高于方块顶）。
     */
    public static supportsColumn(world: World, worldX: number, feetY: number, worldZ: number): boolean {
        const gx = Math.floor(worldX + this.EPSILON);
        const gz = Math.floor(worldZ + this.EPSILON);
        const belowY = Math.floor(feetY - this.EPSILON) - 1;
        const voxel = world.getVoxel(gx, belowY, gz);
        if (voxel === BlockType.AIR) return false;
        const blockData = BLOCK_DATA[voxel];
        return !!(blockData && blockData.isSolid);
    }

    /** 足底多点采样（中心 + 四角），原版潜行体感：少于 3 点有支撑则认为会失足 */
    public static feetHaveEnoughSupport(world: World, feetX: number, feetZ: number, feetY: number, radius: number): boolean {
        const s = radius * 0.9;
        const samples: [number, number][] = [
            [0, 0],
            [s, s],
            [s, -s],
            [-s, s],
            [-s, -s],
        ];
        let hits = 0;
        for (const [ox, oz] of samples) {
            if (this.supportsColumn(world, feetX + ox, feetY, feetZ + oz)) hits++;
        }
        return hits >= 3;
    }
}
