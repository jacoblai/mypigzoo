import * as THREE from 'three';

export class AudioManager {
    private listener: THREE.AudioListener;
    private sounds: Map<string, THREE.Audio> = new Map();
    private audioLoader: THREE.AudioLoader;

    constructor(camera: THREE.PerspectiveCamera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        this.audioLoader = new THREE.AudioLoader();
    }

    /**
     * For a minecraft-like engine, we can use procedural sounds 
     * or simple base64/buffer sounds to keep it zero-dependency.
     */
    public async init() {
        // Create simple procedural sounds using AudioContext
        this.createProceduralSound('break', 0.1, [150, 50], 'noise');
        this.createProceduralSound('place', 0.05, [200, 300], 'sine');
        this.createProceduralSound('step', 0.05, [100, 40], 'noise');
    }

    private createProceduralSound(name: string, duration: number, freqRange: [number, number], type: 'noise' | 'sine') {
        const ctx = THREE.AudioContext.getContext();
        const sampleRate = ctx.sampleRate;
        const frameCount = sampleRate * duration;
        const buffer = ctx.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < frameCount; i++) {
            const t = i / frameCount;
            if (type === 'noise') {
                // Brown/White noise-like for break/step
                data[i] = (Math.random() * 2 - 1) * (1 - t);
            } else {
                // Pitch shift for place
                const freq = freqRange[0] + (freqRange[1] - freqRange[0]) * t;
                data[i] = Math.sin(2 * Math.PI * freq * (i / sampleRate)) * (1 - t);
            }
        }

        const audio = new THREE.Audio(this.listener);
        audio.setBuffer(buffer);
        audio.setVolume(0.3);
        this.sounds.set(name, audio);
    }

    public play(name: string) {
        const sound = this.sounds.get(name);
        if (sound) {
            if (sound.isPlaying) sound.stop();
            sound.play();
        }
    }
}
