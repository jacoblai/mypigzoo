import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { World } from '../world/World';
import { SelectionBox } from './SelectionBox';
import { BlockType, BLOCK_DATA } from '../world/Block';
import { Physics } from '../utils/Physics';
import { Inventory } from './Inventory';
import { Hand } from './Hand';
import { CharacterModel } from './CharacterModel';
import { AudioManager } from '../core/AudioManager';
import { EntityManager } from '../world/EntityManager';
import { InventoryUI } from './InventoryUI';
import { Pig } from '../entity/Pig';

import { PlayerStats } from './PlayerStats';
import { StatsUI } from './StatsUI';
import { CommandSystem } from '../core/CommandSystem';
import { CommandUI } from './CommandUI';

export class Player {
    private controls: PointerLockControls;
    private camera: THREE.PerspectiveCamera;
    
    public position: THREE.Vector3 = new THREE.Vector3(); 
    public velocity: THREE.Vector3 = new THREE.Vector3();
    private lastVelocityY: number = 0;
    
    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private lookUp = false;
    private lookDown = false;
    private lookLeft = false;
    private lookRight = false;
    private canJump = false;
    
    private world: World;
    private selectionBox: SelectionBox;
    private inventory: Inventory;
    private inventoryUI: InventoryUI;
    private stats: PlayerStats;
    private statsUI: StatsUI;
    private commandSystem: CommandSystem;
    private commandUI: CommandUI;
    private hand: Hand;
    private characterModel: CharacterModel;
    public audioManager: AudioManager;
    public entityManager: EntityManager;
    
    private stepTimer = 0;
    private walkTime = 0;
    private readonly STEP_INTERVAL = 0.45;
    
    private isThirdPerson = false;
    private isInventoryOpen = false;

    private isMining = false;
    private miningTarget: THREE.Vector3 | null = null;
    private miningProgress = 0;
    private swingTimer = 0;
    private readonly SWING_INTERVAL = 0.25;

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene: THREE.Scene, world: World) {
        this.world = world;
        this.camera = camera;
        // 设置旋转顺序为 YXZ，防止键盘控制时视角产生 Roll 轴倾斜（“躺下”感）
        this.camera.rotation.order = 'YXZ';
        
        this.controls = new PointerLockControls(camera, domElement);
        this.selectionBox = new SelectionBox(scene, world, camera);
        this.inventory = new Inventory();
        this.inventoryUI = new InventoryUI(this.inventory);
        this.stats = new PlayerStats();
        this.statsUI = new StatsUI(this.stats);

        this.commandSystem = new CommandSystem();
        this.commandUI = new CommandUI(this.commandSystem, () => ({
            inventory: this.inventory,
            entityManager: this.entityManager,
            world: this.world,
            position: this.position,
            direction: new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
        }));

        // 当指令界面打开时，释放控制器
        this.commandUI.setOnToggle((open) => {
            if (open) {
                this.controls.unlock();
            } else {
                this.controls.lock();
            }
        });
        
        // 订阅伤害事件播放声效
        this.stats.onDamage = () => {
            this.audioManager.play('hurt');
        };

        this.hand = new Hand();
        this.characterModel = new CharacterModel();
        
        this.audioManager = new AudioManager(camera);
        this.audioManager.init();

        this.entityManager = new EntityManager(scene, world, this.audioManager, camera);
        
        // Add character model to scene
        scene.add(this.characterModel.group);
        
        const selected = this.inventory.getSelectedSlot();
        this.hand.setBlock(selected ? selected.type : BlockType.AIR);

        // 屏蔽浏览器右键菜单，确保右键放置功能可用
        window.addEventListener('contextmenu', (e) => e.preventDefault());
        
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('resize', () => this.hand.onResize());

        window.addEventListener('inventory-changed', () => {
            this.updateHand();
            this.inventoryUI.update();
        });

        this.controls.addEventListener('lock', () => {
            this.isInventoryOpen = false;
            this.inventoryUI.toggle(false);
        });

        this.controls.addEventListener('unlock', () => {
            // 如果不是因为打开背包导致的解锁（比如按了 Esc），也要确保 UI 状态同步
            if (!this.isInventoryOpen) {
                this.inventoryUI.toggle(false);
            }
        });
    }

    private updateHand() {
        const selected = this.inventory.getSelectedSlot();
        this.hand.setBlock(selected ? selected.type : BlockType.AIR);
    }

    public spawn(x: number, y: number, z: number) {
        // 1. 居中出生点位置
        const centerX = Math.floor(x) + 0.5;
        const centerZ = Math.floor(z) + 0.5;
        
        // 2. 获取地面高度 (寻找最高非空气方块)
        let groundY = this.world.getHighestSolidBlock(centerX, centerZ);
        
        // 3. 安全重生机制：确保出生点上方有 2 格空气，防止陷入方块
        while (groundY < 128) {
            const blockFoot = this.world.getVoxel(centerX, groundY, centerZ);
            const blockHead = this.world.getVoxel(centerX, groundY + 1, centerZ);
            
            if (blockFoot === BlockType.AIR && blockHead === BlockType.AIR) {
                break;
            }
            groundY++;
        }

        // 4. 应用坐标并赋予一个微小的向上偏移
        this.position.set(centerX, groundY + 0.1, centerZ);
        this.velocity.set(0, 0, 0);
        this.canJump = false; 
        this.updateCameraPosition();
    }

    private onMouseDown(event: MouseEvent) {
        if (this.isInventoryOpen) return;

        if (!this.controls.isLocked) {
            this.controls.lock();
            return;
        }
        
        // 兼容 macOS: Ctrl + 左键 视为右键
        const isRightClick = event.button === 2 || (event.button === 0 && event.ctrlKey);

        if (isRightClick) {
            this.hand.swing();
            this.handleInteraction();
        } else if (event.button === 0) {
            // Check for entity attack first
            if (!this.handleAttack()) {
                this.isMining = true;
                this.hand.swing();
            }
        }
    }

    private handleInteraction() {
        const origin = this.camera.position;
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        
        // 1. Check for entities first (Increased range to 8)
        const entity = this.entityManager.intersectEntities(origin, direction, 8);
        if (entity && entity instanceof Pig) {
            const selected = this.inventory.getSelectedSlot();
            if (selected && selected.type === BlockType.CARROT) {
                // Try feeding
                if (entity.feed()) {
                    this.inventory.consumeSelected(1);
                    this.inventoryUI.update();
                    this.updateHand();
                    this.audioManager.play('place'); 
                    return;
                } else {
                    // Feedback even if they can't eat yet (e.g. cooldown)
                    this.audioManager.play('step');
                }
            }
        }

        // 2. Fallback to block placement
        this.placeBlock();
    }

    private dropSelectedItem() {
        const selected = this.inventory.getSelectedSlot();
        if (!selected || selected.count <= 0) return;
        if (selected.type === BlockType.WATER) return;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const spawnPos = this.camera.position.clone().add(forward.multiplyScalar(0.8));
        const spawned = this.entityManager.spawnDrop(selected.type, spawnPos);
        if (!spawned) return;

        this.inventory.consumeSelected(1);
        this.inventoryUI.update();
        this.updateHand();
        this.audioManager.play('place');
    }

    private handleAttack(): boolean {
        const origin = this.camera.position;
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        
        // Slightly increase range to 4.5
        const entity = this.entityManager.intersectEntities(origin, direction, 4.5);
        if (entity) {
            this.hand.swing();
            
            // Damage the entity (standard Minecraft hit is 1 HP by hand)
            entity.takeDamage(1, this.position);
            
            // Play hurt sound
            this.audioManager.play('hurt'); 
            
            // 增加精疲力竭度
            this.stats.addExhaustion(0.1);
            
            return true;
        }
        return false;
    }

    private onMouseUp(event: MouseEvent) {
        if (event.button === 0) {
            this.isMining = false;
            this.miningTarget = null;
            this.miningProgress = 0;
        }
    }

    private onWheel(event: WheelEvent) {
        if (this.isInventoryOpen) return;
        
        if (event.deltaY > 0) this.inventory.next();
        else this.inventory.prev();
        
        this.updateHand();
        this.inventoryUI.update();
    }

    private toggleInventory() {
        this.isInventoryOpen = !this.isInventoryOpen;
        if (this.isInventoryOpen) {
            this.controls.unlock();
            this.inventoryUI.toggle(true);
            this.resetMining();
        } else {
            this.controls.lock();
            this.inventoryUI.toggle(false);
        }
    }

    private onKeyDown(event: KeyboardEvent) {
        if (this.isInventoryOpen && event.code !== 'KeyE' && event.code !== 'Escape') return;
        if (this.commandUI.isFocused() && event.code !== 'Enter' && event.code !== 'Escape') return;

        switch (event.code) {
            case 'Slash':
                if (!this.isInventoryOpen) {
                    this.commandUI.toggle(true);
                }
                break;
            case 'KeyW': this.moveForward = true; break;
            case 'KeyS': this.moveBackward = true; break;
            case 'KeyA': this.moveLeft = true; break;
            case 'KeyD': this.moveRight = true; break;
            case 'Space': 
                if (this.canJump) {
                    this.velocity.y = 8.5; 
                    this.canJump = false;
                    this.stats.addExhaustion(0.05); // 跳跃消耗
                }
                break;
            case 'KeyE':
                this.toggleInventory();
                break;
            case 'KeyR':
                this.hand.swing();
                this.handleInteraction();
                break;
            case 'KeyQ':
                this.dropSelectedItem();
                break;
            case 'KeyF':
                if (!this.handleAttack()) {
                    this.isMining = true;
                    this.hand.swing();
                }
                break;
            case 'Digit1': this.selectSlot(0); break;
            case 'Digit2': this.selectSlot(1); break;
            case 'Digit3': this.selectSlot(2); break;
            case 'Digit4': this.selectSlot(3); break;
            case 'Digit5': this.selectSlot(4); break;
            case 'Digit6': this.selectSlot(5); break;
            case 'Digit7': this.selectSlot(6); break;
            case 'Digit8': this.selectSlot(7); break;
            case 'Digit9': this.selectSlot(8); break;
            case 'KeyC':
                this.isThirdPerson = !this.isThirdPerson;
                break;
            case 'KeyI': this.lookUp = true; break;
            case 'KeyK': this.lookDown = true; break;
            case 'KeyJ': this.lookLeft = true; break;
            case 'KeyL': this.lookRight = true; break;
        }
    }

    private selectSlot(index: number) {
        this.inventory.select(index);
        this.updateHand();
        this.inventoryUI.update();
        this.audioManager.play('place'); 
    }

    private onKeyUp(event: KeyboardEvent) {
        switch (event.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyD': this.moveRight = false; break;
            case 'KeyF': 
                this.isMining = false;
                this.miningTarget = null;
                this.miningProgress = 0;
                break;
            case 'KeyI': this.lookUp = false; break;
            case 'KeyK': this.lookDown = false; break;
            case 'KeyJ': this.lookLeft = false; break;
            case 'KeyL': this.lookRight = false; break;
        }
    }

    private handleMining(delta: number, hit: any) {
        if (!this.isMining) return;

        if (!hit) {
            this.resetMining();
            return;
        }

        const voxel = this.world.getVoxel(hit.position.x, hit.position.y, hit.position.z);
        if (voxel === BlockType.AIR) {
            this.resetMining();
            return;
        }

        // Check if we are still hitting the same block
        const hitPos = hit.position;
        if (!this.miningTarget || !this.miningTarget.equals(hitPos)) {
            this.miningTarget = hitPos.clone();
            this.miningProgress = 0;
            this.swingTimer = 0;
        }

        // Continue swinging hand
        this.swingTimer += delta;
        if (this.swingTimer >= this.SWING_INTERVAL) {
            this.hand.swing();
            this.audioManager.play('step'); // Use step sound for hitting for now
            this.swingTimer = 0;
        }

        // Progress mining
        const blockData = BLOCK_DATA[voxel];
        const hardness = blockData?.hardness ?? 0.2;
        
        if (hardness < 0) return; // Bedrock or unbreakable
        const tool = this.inventory.getSelectedSlot()?.type ?? null;
        const speedMultiplier = this.getMiningSpeedMultiplier(tool, voxel);
        
        this.miningProgress += delta * speedMultiplier;

        if (this.miningProgress >= hardness) {
            this.performDestroyBlock(hit.position, voxel);
            this.resetMining();
        }
    }

    private resetMining() {
        this.miningTarget = null;
        this.miningProgress = 0;
        this.swingTimer = 0;
    }

    private performDestroyBlock(position: THREE.Vector3, blockType: number) {
        // Spawn drop BEFORE setting to AIR
        this.entityManager.spawnDrop(blockType, position.clone().add(new THREE.Vector3(0.5, 0.5, 0.5)));
        this.world.setVoxel(position.x, position.y, position.z, BlockType.AIR);
        this.audioManager.play('break');
        
        // 增加经验值和精疲力竭度
        this.stats.addExperience(1);
        this.stats.addExhaustion(0.005);
    }

    private placeBlock() {
        const selected = this.inventory.getSelectedSlot();
        if (!selected || selected.count <= 0) return;

        // 饮食逻辑优先
        const blockData = BLOCK_DATA[selected.type];
        if (blockData?.isEdible && this.stats.hunger < 20) {
            this.stats.eat(blockData.nutrition || 1, blockData.saturation || 0.5);
            this.inventory.consumeSelected(1);
            this.inventoryUI.update();
            this.updateHand();
            this.audioManager.play('step'); // 暂时用 step 音效代替吃东西
            return;
        }
        if (blockData?.isPlaceable === false) return;

        const hit = this.selectionBox.update();
        if (hit) {
            const placePos = hit.position.clone().add(hit.normal);
            
            // 碰撞检测：防止在玩家自己身体所在位置放置方块
            const playerX = Math.floor(this.position.x);
            const playerZ = Math.floor(this.position.z);
            const playerY_low = Math.floor(this.position.y);
            const playerY_high = Math.floor(this.position.y + Physics.PLAYER_HEIGHT * 0.9);

            if (placePos.x === playerX && placePos.z === playerZ && 
                (placePos.y === playerY_low || placePos.y === playerY_high)) {
                return;
            }
            
            this.world.setVoxel(placePos.x, placePos.y, placePos.z, selected.type);
            this.inventory.consumeSelected(1);
            this.inventoryUI.update();
            
            // Update hand if item ran out
            this.updateHand();
            
            this.audioManager.play('place');
        }
    }

    private getMiningSpeedMultiplier(tool: BlockType | null, target: BlockType): number {
        if (!tool) return 1;
        if (!this.isStoneLike(target)) return 1;

        switch (tool) {
            case BlockType.WOODEN_PICKAXE:
                return 2.0;
            case BlockType.STONE_PICKAXE:
                return 4.0;
            default:
                return 1;
        }
    }

    private isStoneLike(type: BlockType): boolean {
        return (
            type === BlockType.STONE ||
            type === BlockType.COBBLESTONE ||
            type === BlockType.COAL_ORE ||
            type === BlockType.IRON_ORE ||
            type === BlockType.GOLD_ORE ||
            type === BlockType.DIAMOND_ORE
        );
    }

    public update(delta: number) {
        this.entityManager.update(delta, this.position, this.inventory);
        const hit = this.selectionBox.update();

        if (!this.controls.isLocked && !this.isInventoryOpen) {
            this.hand.update(delta, false);
            this.resetMining();
            return;
        }

        if (this.isInventoryOpen) {
            this.hand.update(delta, false);
            this.resetMining();
            return;
        }

        // 处理挖掘逻辑
        this.handleMining(delta, hit);

        // 更新状态逻辑
        this.stats.update(delta);
        this.statsUI.update();

        // 0. 处理键盘视角旋转 (I J K L) - 采用互斥逻辑防止视角倾斜
        const lookSpeed = 2.0;
        if (this.lookUp) {
            this.camera.rotation.x += lookSpeed * delta;
        } else if (this.lookDown) {
            this.camera.rotation.x -= lookSpeed * delta;
        } else if (this.lookLeft) {
            this.camera.rotation.y += lookSpeed * delta;
        } else if (this.lookRight) {
            this.camera.rotation.y -= lookSpeed * delta;
        }
        
        // 限制仰角，防止翻转
        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));

        // 1. 物理环境准备 (应用阻力)
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        
        // 只有不站在地上时才受重力影响
        if (!this.canJump) {
            this.velocity.y -= 25.0 * delta; 
        } else {
            // 站在地上时给予一个极小的向下压力，确保碰撞持续生效
            this.velocity.y = -0.1;
        }

        // 记录更新前的垂直速度用于计算坠落伤害
        this.lastVelocityY = this.velocity.y;

        // 2. 输入转换为速度
        const moveSpeed = 45.0;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

        if (this.moveForward) this.velocity.addScaledVector(forward, moveSpeed * delta);
        if (this.moveBackward) this.velocity.addScaledVector(forward, -moveSpeed * delta);
        if (this.moveLeft) this.velocity.addScaledVector(right, -moveSpeed * delta);
        if (this.moveRight) this.velocity.addScaledVector(right, moveSpeed * delta);

        // 3. 物理决议
        const oldPos = this.position.clone();
        const result = Physics.collide(this.world, this.position, this.velocity, delta);
        
        // 坠落伤害检测
        if (result.isGrounded && !this.canJump) {
            if (this.lastVelocityY < -13) {
                const damage = Math.floor((Math.abs(this.lastVelocityY) - 12) * 1.5);
                if (damage > 0) {
                    this.stats.damage(damage);
                }
            }
        }

        // 自动跳跃逻辑：当玩家在地面移动但水平速度被阻挡时，检查是否可以自动跳上台阶
        if (result.isGrounded && (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight)) {
            const isHorizontalBlocked = 
                (Math.abs(this.velocity.x) > 0.1 && Math.abs(result.velocity.x) < 0.01) ||
                (Math.abs(this.velocity.z) > 0.1 && Math.abs(result.velocity.z) < 0.01);
            
            if (isHorizontalBlocked) {
                // 计算移动方向
                const moveDir = new THREE.Vector3();
                const f = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                f.y = 0; f.normalize();
                const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0));
                
                if (this.moveForward) moveDir.add(f);
                if (this.moveBackward) moveDir.add(f.clone().negate());
                if (this.moveLeft) moveDir.add(r.clone().negate());
                if (this.moveRight) moveDir.add(r);
                moveDir.normalize();

                // 检查前方是否有 1 格高的障碍物
                const checkDist = 0.5;
                const checkX = this.position.x + moveDir.x * checkDist;
                const checkZ = this.position.z + moveDir.z * checkDist;
                
                const kneeBlock = this.world.getVoxel(checkX, this.position.y + 0.5, checkZ);
                const headBlock = this.world.getVoxel(checkX, this.position.y + 1.5, checkZ);
                
                // 如果前方脚下有方块且头顶没方块，则执行跳跃
                if (kneeBlock !== BlockType.AIR && headBlock === BlockType.AIR) {
                    result.velocity.y = 8.5; 
                    result.isGrounded = false;
                    this.stats.addExhaustion(0.05);
                }
            }
        }

        this.position.copy(result.position);
        this.velocity.copy(result.velocity);
        this.canJump = result.isGrounded;

        // 4. 计算实际位移来判定动画和音效 (解决对着墙跑音效鬼畜的问题)
        const actualHorizontalDist = Math.sqrt((this.position.x - oldPos.x)**2 + (this.position.z - oldPos.z)**2);
        const isActuallyMoving = actualHorizontalDist > 0.005 && this.canJump;

        this.hand.update(delta, isActuallyMoving);

        if (isActuallyMoving) {
            this.walkTime += delta;
            this.stepTimer += delta;
            
            // 运动消耗
            this.stats.addExhaustion(actualHorizontalDist * 0.1);

            if (this.stepTimer >= this.STEP_INTERVAL) {
                this.audioManager.play('step');
                this.stepTimer = 0;
            }
        } else {
            this.walkTime = 0;
            this.stepTimer = this.STEP_INTERVAL;
        }

        // 5. 应用坐标并更新模型
        this.updateCameraPosition();

        // 6. 更新模型位置和旋转 (模型原点已在 CharacterModel 中对齐到脚底)
        this.characterModel.group.position.copy(this.position);
        
        const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.characterModel.group.rotation.y = Math.atan2(camDir.x, camDir.z);
        
        // Pass camera pitch to character model
        const headPitch = this.camera.rotation.x;
        this.characterModel.updateAnimation(this.walkTime, isActuallyMoving, headPitch);
    }

    private updateCameraPosition() {
        if (!this.isThirdPerson) {
            // 第一人称视角
            this.camera.position.copy(this.position);
            this.camera.position.y += Physics.EYE_HEIGHT;
            
            // 隐藏头和身体，避免穿模
            this.characterModel.head.visible = false;
            this.characterModel.torso.visible = false;
        } else {
            // 第三人称视角（背视）
            const camDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion);
            const targetPos = this.position.clone();
            targetPos.y += Physics.EYE_HEIGHT + 0.5; // 稍微抬高视点，防止被肩膀遮挡
            
            // 相机向后偏移 5 个单位 (增加距离以看清全貌)
            const offset = camDir.multiplyScalar(5);
            this.camera.position.copy(targetPos).add(offset);
            
            // 显示完整模型
            this.characterModel.head.visible = true;
            this.characterModel.torso.visible = true;
        }
    }

    public renderHand(renderer: THREE.WebGLRenderer) {
        if (!this.isThirdPerson) {
            this.hand.render(renderer);
        }
    }
}
