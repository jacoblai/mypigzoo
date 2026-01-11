import * as THREE from 'three';

export class EnvironmentSystem {
    private scene: THREE.Scene;
    
    // Time management
    private time: number = 0.25; // 0.0 to 1.0, 0.25 is Sunrise in this system
    private readonly dayDuration: number = 1200; // Minecraft full cycle: 20 minutes (1200 seconds)
    
    // Components
    private sunGroup: THREE.Group;
    private sunMesh: THREE.Mesh;
    private moonMesh: THREE.Mesh;
    private mainLight: THREE.DirectionalLight;
    private ambientLight: THREE.AmbientLight;

    // Colors
    private readonly SKY_COLORS = {
        MIDNIGHT: new THREE.Color(0x020205),
        DAWN: new THREE.Color(0xff7043),
        NOON: new THREE.Color(0x87ceeb),
        DUSK: new THREE.Color(0xff5722)
    };

    private readonly LIGHT_COLORS = {
        NIGHT: new THREE.Color(0x4444ff),
        DAY: new THREE.Color(0xffffff)
    };

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        
        // 1. Setup Celestial Bodies
        this.sunGroup = new THREE.Group();
        this.scene.add(this.sunGroup);

        // Sun: A big yellow voxel
        const sunGeom = new THREE.BoxGeometry(20, 20, 20);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
        this.sunMesh.position.set(0, 400, 0); // Far away
        this.sunGroup.add(this.sunMesh);

        // Moon: A smaller white/grey voxel
        const moonGeom = new THREE.BoxGeometry(15, 15, 15);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
        this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
        this.moonMesh.position.set(0, -400, 0); // Opposite to sun
        this.sunGroup.add(this.moonMesh);

        // 2. Setup Lights
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);

        this.mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.mainLight.castShadow = false; // Voxel world usually uses baked or simple lighting
        this.scene.add(this.mainLight);
    }

    public update(delta: number, playerPosition: THREE.Vector3) {
        // Update time
        this.time = (this.time + delta / this.dayDuration) % 1.0;

        // Keep celestial bodies centered on player to simulate infinity
        this.sunGroup.position.copy(playerPosition);

        // Rotate celestial bodies (X-axis rotation creates the day/night arc)
        // 0.0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight
        // Offset by PI to match our 0.0=sunrise starting point
        const angle = this.time * Math.PI * 2 + Math.PI;
        this.sunGroup.rotation.x = angle;

        // Update light position based on sun/moon
        // Use sun position for light if sun is above horizon
        const sunWorldPos = new THREE.Vector3();
        this.sunMesh.getWorldPosition(sunWorldPos);
        const moonWorldPos = new THREE.Vector3();
        this.moonMesh.getWorldPosition(moonWorldPos);

        const isDay = sunWorldPos.y > 0;
        this.mainLight.position.copy(isDay ? sunWorldPos : moonWorldPos);

        this.updateAtmosphere(isDay, sunWorldPos.y);
    }

    private updateAtmosphere(isDay: boolean, sunY: number) {
        // sunY ranges from approx -400 to 400
        const normalizedHeight = Math.max(-1, Math.min(1, sunY / 400));
        
        let skyColor = new THREE.Color();
        let ambientIntensity = 0.2;
        let directIntensity = 0.0;

        if (normalizedHeight > 0.1) {
            // Day time
            skyColor.lerpColors(this.SKY_COLORS.DAWN, this.SKY_COLORS.NOON, (normalizedHeight - 0.1) / 0.9);
            ambientIntensity = 0.4 + 0.3 * normalizedHeight;
            directIntensity = 1.0 * normalizedHeight;
            this.mainLight.color.copy(this.LIGHT_COLORS.DAY);
        } else if (normalizedHeight > -0.1) {
            // Dawn / Dusk transition
            const t = (normalizedHeight + 0.1) / 0.2;
            skyColor.lerpColors(this.SKY_COLORS.MIDNIGHT, this.SKY_COLORS.DAWN, t);
            ambientIntensity = 0.2 + 0.2 * t;
            directIntensity = 0.2 * t;
            this.mainLight.color.lerpColors(this.LIGHT_COLORS.NIGHT, this.SKY_COLORS.DAWN, t);
        } else {
            // Night time
            const t = Math.abs(normalizedHeight + 0.1) / 0.9;
            skyColor.copy(this.SKY_COLORS.MIDNIGHT);
            ambientIntensity = 0.15;
            directIntensity = 0.1; // Moon light
            this.mainLight.color.copy(this.LIGHT_COLORS.NIGHT);
        }

        this.scene.background = skyColor;
        this.ambientLight.intensity = ambientIntensity;
        this.mainLight.intensity = directIntensity;
    }
}
