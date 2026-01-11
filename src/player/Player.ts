import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { World } from '../world/World';
import { SelectionBox } from './SelectionBox';
import { BlockType } from '../world/Block';
import { Physics } from '../utils/Physics';
import { Inventory } from './Inventory';
import { Hand } from './Hand';
import { CharacterModel } from './CharacterModel';
import { AudioManager } from '../core/AudioManager';

export class Player {
    private controls: PointerLockControls;
    private camera: THREE.PerspectiveCamera;
    
    public position: THREE.Vector3 = new THREE.Vector3(); 
    public velocity: THREE.Vector3 = new THREE.Vector3();
    
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
    private hand: Hand;
    private characterModel: CharacterModel;
    private audioManager: AudioManager;
    
    private stepTimer = 0;
    private walkTime = 0;
    private readonly STEP_INTERVAL = 0.45;
    
    private isThirdPerson = false;

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene: THREE.Scene, world: World) {
        this.world = world;
        this.camera = camera;
        // 设置旋转顺序为 YXZ，防止键盘控制时视角产生 Roll 轴倾斜（“躺下”感）
        this.camera.rotation.order = 'YXZ';
        
        this.controls = new PointerLockControls(camera, domElement);
        this.selectionBox = new SelectionBox(scene, world, camera);
        this.inventory = new Inventory();
        this.hand = new Hand();
        this.characterModel = new CharacterModel();
        
        // Add character model to scene
        scene.add(this.characterModel.group);
        
        this.audioManager = new AudioManager(camera);
        this.audioManager.init();
        
        this.hand.setBlock(this.inventory.getSelectedBlock());

        // 屏蔽浏览器右键菜单，确保右键放置功能可用
        window.addEventListener('contextmenu', (e) => e.preventDefault());
        
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('resize', () => this.hand.onResize());
    }

    public spawn(x: number, y: number, z: number) {
        this.position.set(x, y, z);
        this.velocity.set(0, 0, 0);
        this.updateCameraPosition();
    }

    private onMouseDown(event: MouseEvent) {
        if (!this.controls.isLocked) {
            this.controls.lock();
            return;
        }
        
        this.hand.swing();

        if (event.button === 0) this.destroyBlock();
        if (event.button === 2) this.placeBlock();
    }

    private onWheel(event: WheelEvent) {
        if (event.deltaY > 0) this.inventory.next();
        else this.inventory.prev();
        this.hand.setBlock(this.inventory.getSelectedBlock());
    }

    private onKeyDown(event: KeyboardEvent) {
        switch (event.code) {
            case 'KeyW': this.moveForward = true; break;
            case 'KeyS': this.moveBackward = true; break;
            case 'KeyA': this.moveLeft = true; break;
            case 'KeyD': this.moveRight = true; break;
            case 'Space': 
                if (this.canJump) {
                    this.velocity.y = 8.5; 
                    this.canJump = false;
                }
                break;
            case 'KeyE':
                this.placeBlock();
                break;
            case 'KeyF':
                this.hand.swing();
                this.destroyBlock();
                break;
            case 'KeyR':
                this.inventory.next();
                this.hand.setBlock(this.inventory.getSelectedBlock());
                this.audioManager.play('place'); // 切换材质时播放一个提示音
                break;
            case 'Digit1': this.inventory.select(0); this.hand.setBlock(this.inventory.getSelectedBlock()); break;
            case 'Digit2': this.inventory.select(1); this.hand.setBlock(this.inventory.getSelectedBlock()); break;
            case 'Digit3': this.inventory.select(2); this.hand.setBlock(this.inventory.getSelectedBlock()); break;
            case 'KeyC':
                this.isThirdPerson = !this.isThirdPerson;
                break;
            case 'KeyI': this.lookUp = true; break;
            case 'KeyK': this.lookDown = true; break;
            case 'KeyJ': this.lookLeft = true; break;
            case 'KeyL': this.lookRight = true; break;
        }
    }

    private onKeyUp(event: KeyboardEvent) {
        switch (event.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyD': this.moveRight = false; break;
            case 'KeyI': this.lookUp = false; break;
            case 'KeyK': this.lookDown = false; break;
            case 'KeyJ': this.lookLeft = false; break;
            case 'KeyL': this.lookRight = false; break;
        }
    }

    private destroyBlock() {
        const hit = this.selectionBox.update();
        if (hit) {
            this.world.setVoxel(hit.position.x, hit.position.y, hit.position.z, BlockType.AIR);
            this.audioManager.play('break');
        }
    }

    private placeBlock() {
        const hit = this.selectionBox.update();
        if (hit) {
            const placePos = hit.position.clone().add(hit.normal);
            
            // 碰撞检测：防止在玩家自己身体所在位置放置方块
            // 玩家高度 1.8，占据两个垂直方块
            const playerX = Math.floor(this.position.x);
            const playerZ = Math.floor(this.position.z);
            const playerY_low = Math.floor(this.position.y);
            const playerY_high = Math.floor(this.position.y + Physics.PLAYER_HEIGHT * 0.9);

            if (placePos.x === playerX && placePos.z === playerZ && 
                (placePos.y === playerY_low || placePos.y === playerY_high)) {
                return;
            }
            
            this.world.setVoxel(placePos.x, placePos.y, placePos.z, this.inventory.getSelectedBlock());
            this.audioManager.play('place');
        }
    }

    public update(delta: number) {
        this.selectionBox.update();

        if (!this.controls.isLocked) {
            this.hand.update(delta, false);
            return;
        }

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
        
        this.characterModel.updateAnimation(this.walkTime, isActuallyMoving);
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
            targetPos.y += Physics.EYE_HEIGHT;
            
            // 相机向后偏移 4 个单位
            const offset = camDir.multiplyScalar(4);
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
