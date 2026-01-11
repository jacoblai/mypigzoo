import { CoreEngine } from './core/CoreEngine';
import { World } from './world/World';
import { Player } from './player/Player';

const container = document.getElementById('app');
if (container) {
    const engine = new CoreEngine(container);
    const world = new World(engine.scene);
    const player = new Player(engine.camera, container, engine.scene, world);

    // 在 Spawn 前无需手动 update，spawn 内部已包含逻辑
    player.spawn(8, 32, 8);

    // Register update loop
    engine.addUpdateCallback((delta) => {
        // 限制 delta 范围，防止因页面卡顿导致物理引擎瞬间位移过大
        const limitedDelta = Math.min(delta, 0.05);
        
        // 1. 更新世界
        world.update(player.position);
        
        // 2. 更新玩家
        player.update(limitedDelta);
    });

    // Register hand rendering
    engine.setPostRenderCallback((renderer) => {
        player.renderHand(renderer);
    });

    engine.start();
}
