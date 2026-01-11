import * as THREE from 'three';

export class EnvironmentSystem {
    private scene: THREE.Scene;
    
    // Time management
    private time: number = 0.25; 
    private readonly dayDuration: number = 1200; // 20 minutes
    
    // Decoupling: Tick management
    private lastTickTime: number = 0;
    private readonly TICK_INTERVAL = 1 / 20; // 20Hz update (50ms)

    // Components
    private sunGroup: THREE.Group;
    private sunMesh: THREE.Mesh;
    private moonMesh: THREE.Mesh;
    private mainLight: THREE.DirectionalLight;
    private ambientLight: THREE.AmbientLight;

    // Pre-allocated objects to avoid GC
    private skyColor = new THREE.Color();
    private sunWorldPos = new THREE.Vector3();
    private moonWorldPos = new THREE.Vector3();

    // Colors constants (pre-allocated)
    private readonly COLORS = {
        MIDNIGHT: new THREE.Color(0x020205),
        DAWN: new THREE.Color(0xff7043),
        NOON: new THREE.Color(0x87ceeb),
        DUSK: new THREE.Color(0xff5722),
        NIGHT_LIGHT: new THREE.Color(0x4444ff),
        DAY_LIGHT: new THREE.Color(0xffffff)
    };

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        
        // Ensure background is a Color object for copy() to work
        if (!(this.scene.background instanceof THREE.Color)) {
            this.scene.background = new THREE.Color(0x000000);
        }

        this.sunGroup = new THREE.Group();
        this.scene.add(this.sunGroup);

        const sunGeom = new THREE.BoxGeometry(20, 20, 20);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
        this.sunMesh.position.set(0, 400, 0);
        this.sunGroup.add(this.sunMesh);

        const moonGeom = new THREE.BoxGeometry(15, 15, 15);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
        this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
        this.moonMesh.position.set(0, -400, 0);
        this.sunGroup.add(this.moonMesh);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);

        this.mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.scene.add(this.mainLight);
    }

    public update(delta: number, playerPosition: THREE.Vector3) {
        // 1. Position sync must be every frame for visual smoothness
        this.sunGroup.position.copy(playerPosition);

        // 2. Logic update at fixed frequency (20Hz)
        this.lastTickTime += delta;
        if (this.lastTickTime >= this.TICK_INTERVAL) {
            this.tick(this.lastTickTime);
            this.lastTickTime = 0;
        }
    }

    private tick(tickDelta: number) {
        // Advance time
        this.time = (this.time + tickDelta / this.dayDuration) % 1.0;

        // Rotate celestial bodies
        const angle = this.time * Math.PI * 2 + Math.PI;
        this.sunGroup.rotation.x = angle;

        // Update lighting and atmosphere
        this.sunMesh.getWorldPosition(this.sunWorldPos);
        this.moonMesh.getWorldPosition(this.moonWorldPos);

        const isDay = this.sunWorldPos.y > 0;
        this.mainLight.position.copy(isDay ? this.sunWorldPos : this.moonWorldPos);

        this.updateAtmosphere(isDay, this.sunWorldPos.y);
    }

    private updateAtmosphere(isDay: boolean, sunY: number) {
        const normalizedHeight = Math.max(-1, Math.min(1, sunY / 400));
        
        let ambientIntensity = 0.2;
        let directIntensity = 0.0;

        if (normalizedHeight > 0.1) {
            // Day time
            const t = (normalizedHeight - 0.1) / 0.9;
            this.skyColor.lerpColors(this.COLORS.DAWN, this.COLORS.NOON, t);
            ambientIntensity = 0.4 + 0.3 * normalizedHeight;
            directIntensity = 1.0 * normalizedHeight;
            this.mainLight.color.copy(this.COLORS.DAY_LIGHT);
        } else if (normalizedHeight > -0.1) {
            // Dawn / Dusk transition
            const t = (normalizedHeight + 0.1) / 0.2;
            this.skyColor.lerpColors(this.COLORS.MIDNIGHT, this.COLORS.DAWN, t);
            ambientIntensity = 0.2 + 0.2 * t;
            directIntensity = 0.2 * t;
            this.mainLight.color.lerpColors(this.COLORS.NIGHT_LIGHT, this.COLORS.DAWN, t);
        } else {
            // Night time
            this.skyColor.copy(this.COLORS.MIDNIGHT);
            ambientIntensity = 0.15;
            directIntensity = 0.1;
            this.mainLight.color.copy(this.COLORS.NIGHT_LIGHT);
        }

        // Zero-GC application to scene background
        if (this.scene.background instanceof THREE.Color) {
            this.scene.background.copy(this.skyColor);
        }
        
        this.ambientLight.intensity = ambientIntensity;
        this.mainLight.intensity = directIntensity;
    }
}
