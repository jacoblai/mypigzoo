import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { World } from '../world/World';
import { SelectionBox } from './SelectionBox';
import { BlockType } from '../world/Block';
import { Physics } from '../utils/Physics';
import { Inventory } from './Inventory';
import { Hand } from './Hand';
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
    private canJump = false;
    
    private world: World;
    private selectionBox: SelectionBox;
    private inventory: Inventory;
    private hand: Hand;
    private audioManager: AudioManager;
    
    private stepTimer = 0;
    private readonly STEP_INTERVAL = 0.45;

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene: THREE.Scene, world: World) {
        this.world = world;
        this.camera = camera;
        
        this.controls = new PointerLockControls(camera, domElement);
        this.selectionBox = new SelectionBox(scene, world, camera);
        this.inventory = new Inventory();
        this.hand = new Hand();
        this.audioManager = new AudioManager(camera);
        this.audioManager.init();
        
        this.hand.setBlock(this.inventory.getSelectedBlock());

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
            case 'Digit1': this.inventory.select(0); this.hand.setBlock(this.inventory.getSelectedBlock()); break;
            case 'Digit2': this.inventory.select(1); this.hand.setBlock(this.inventory.getSelectedBlock()); break;
            case 'Digit3': this.inventory.select(2); this.hand.setBlock(this.inventory.getSelectedBlock()); break;
        }
    }

    private onKeyUp(event: KeyboardEvent) {
        switch (event.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyD': this.moveRight = false; break;
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
            const dist = placePos.distanceTo(new THREE.Vector3(this.position.x, placePos.y, this.position.z));
            if (dist < 0.5 && (placePos.y === Math.floor(this.position.y) || placePos.y === Math.floor(this.position.y + 1))) return;
            
            this.world.setVoxel(placePos.x, placePos.y, placePos.z, this.inventory.getSelectedBlock());
            this.audioManager.play('place');
        }
    }

    public update(delta: number) {
        this.selectionBox.update();
        this.hand.update(delta);

        if (!this.controls.isLocked) return;

        // 1. 物理环境准备
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
        const result = Physics.collide(this.world, this.position, this.velocity, delta);
        this.canJump = result.isGrounded;

        // 音效判定
        if (this.canJump) {
            const horizontalSpeed = Math.sqrt(this.velocity.x**2 + this.velocity.z**2);
            if (horizontalSpeed > 1.5) {
                this.stepTimer += delta;
                if (this.stepTimer >= this.STEP_INTERVAL) {
                    this.audioManager.play('step');
                    this.stepTimer = 0;
                }
            }
        }

        // 4. 应用坐标
        this.position.copy(result.position);
        this.updateCameraPosition();
    }

    private updateCameraPosition() {
        this.camera.position.copy(this.position);
        this.camera.position.y += Physics.EYE_HEIGHT;
    }

    public renderHand(renderer: THREE.WebGLRenderer) {
        this.hand.render(renderer);
    }
}
