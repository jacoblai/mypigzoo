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
        this.createProceduralSound('break', 0.1, [150, 50], 'noise', 0.3);
        this.createProceduralSound('place', 0.05, [200, 300], 'sine', 0.2);
        // 走路声效：稍微延长一点，配合低通滤波会更沉闷（不刺耳），音量也调小一点
        this.createProceduralSound('step', 0.08, [100, 40], 'noise', 0.15);
    }

    private createProceduralSound(name: string, duration: number, freqRange: [number, number], type: 'noise' | 'sine', volume: number = 0.3) {
        const ctx = THREE.AudioContext.getContext();
        const sampleRate = ctx.sampleRate;
        const frameCount = sampleRate * duration;
        const buffer = ctx.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < frameCount; i++) {
            const t = i / frameCount;
            if (type === 'noise') {
                // 使用简单的低通滤波（平滑处理）使噪声不那么刺耳，更接近“闷响”
                const white = (Math.random() * 2 - 1);
                lastOut = lastOut * 0.85 + white * 0.15;
                data[i] = lastOut * (1 - t);
            } else {
                // Pitch shift for place
                const freq = freqRange[0] + (freqRange[1] - freqRange[0]) * t;
                data[i] = Math.sin(2 * Math.PI * freq * (i / sampleRate)) * (1 - t);
            }
        }

        const audio = new THREE.Audio(this.listener);
        audio.setBuffer(buffer);
        audio.setVolume(volume);
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
