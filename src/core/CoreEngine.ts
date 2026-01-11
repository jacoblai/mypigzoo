import * as THREE from 'three';
import { EnvironmentSystem } from './EnvironmentSystem';

export class CoreEngine {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;
    private environment: EnvironmentSystem;
    private onUpdateCallbacks: ((delta: number) => void)[] = [];

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000 // Increased far plane for celestial bodies
        );

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        this.environment = new EnvironmentSystem(this.scene);
        window.addEventListener('resize', () => this.onWindowResize());
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public addUpdateCallback(callback: (delta: number) => void) {
        this.onUpdateCallbacks.push(callback);
    }

    public start() {
        this.renderer.setAnimationLoop(() => {
            const delta = this.clock.getDelta();
            
            // Update environment (Day/Night cycle)
            this.environment.update(delta, this.camera.position);

            for (const callback of this.onUpdateCallbacks) {
                callback(delta);
            }
            
            this.renderer.autoClear = true;
            this.renderer.render(this.scene, this.camera);
            
            // Allow external rendering (like FPS Hand)
            this.onPostRender(this.renderer);
        });
    }

    private onPostRender: (renderer: THREE.WebGLRenderer) => void = () => {};

    public setPostRenderCallback(callback: (renderer: THREE.WebGLRenderer) => void) {
        this.onPostRender = callback;
    }
}
