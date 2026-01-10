import * as THREE from 'three';

export class CoreEngine {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;
    private onUpdateCallbacks: ((delta: number) => void)[] = [];

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        this.initLights();
        window.addEventListener('resize', () => this.onWindowResize());
    }

    private initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
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
