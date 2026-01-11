import { PlayerStats } from './PlayerStats';

export class StatsUI {
    private stats: PlayerStats;
    private container: HTMLElement;
    private healthContainer: HTMLElement;
    private hungerContainer: HTMLElement;
    private xpContainer: HTMLElement;
    private xpBarInner: HTMLElement;
    private xpLevelText: HTMLElement;

    constructor(stats: PlayerStats) {
        this.stats = stats;
        
        // 创建主容器
        this.container = document.createElement('div');
        this.container.id = 'stats-ui';
        
        // 创建血条容器
        this.healthContainer = document.createElement('div');
        this.healthContainer.className = 'stats-row health-row';
        
        // 创建饥饿条容器
        this.hungerContainer = document.createElement('div');
        this.hungerContainer.className = 'stats-row hunger-row';
        
        // 创建经验条
        this.xpContainer = document.createElement('div');
        this.xpContainer.className = 'xp-bar-container';
        
        this.xpBarInner = document.createElement('div');
        this.xpBarInner.className = 'xp-bar-inner';
        this.xpContainer.appendChild(this.xpBarInner);
        
        this.xpLevelText = document.createElement('div');
        this.xpLevelText.className = 'xp-level-text';
        this.xpContainer.appendChild(this.xpLevelText);

        this.container.appendChild(this.healthContainer);
        this.container.appendChild(this.hungerContainer);
        this.container.appendChild(this.xpContainer);

        // 挂载到 body 以确保不会被容器裁剪
        document.body.appendChild(this.container);
        
        this.createStyles();
        this.update();
    }

    private createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #stats-ui {
                position: fixed; /* 改为 fixed 确保相对于窗口定位 */
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                width: 480px;
                height: 40px;
                pointer-events: none;
                z-index: 9999; /* 极高层级 */
            }
            .stats-row {
                display: flex;
                gap: 2px;
                position: absolute;
                bottom: 12px;
                width: 180px;
            }
            .health-row { left: 0; }
            .hunger-row { right: 0; flex-direction: row-reverse; }
            
            .stat-icon {
                width: 18px;
                height: 18px;
                background-color: #f00; /* 先用纯色测试 */
                border: 1px solid #000;
                image-rendering: pixelated;
            }
            .hunger-row .stat-icon {
                background-color: #845439;
            }
            
            .xp-bar-container {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 10px;
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid #000;
            }
            .xp-bar-inner {
                height: 100%;
                background: #76FF03;
                width: 50%; /* 初始测试宽度 */
            }
            .xp-level-text {
                position: absolute;
                top: -18px;
                left: 50%;
                transform: translateX(-50%);
                color: #76FF03;
                font-family: 'monospace';
                font-weight: bold;
                font-size: 16px;
                text-shadow: 2px 2px 0px #000;
            }
        `;
        document.head.appendChild(style);
    }

    public update() {
        this.updateHealth();
        this.updateHunger();
        this.updateXP();
    }

    private updateHealth() {
        this.healthContainer.innerHTML = '';
        const health = Math.ceil(this.stats.health / 2);
        for (let i = 0; i < 10; i++) {
            const icon = document.createElement('div');
            icon.className = 'stat-icon';
            if (i >= health) {
                icon.style.backgroundColor = 'rgba(0,0,0,0.5)';
            }
            this.healthContainer.appendChild(icon);
        }
    }

    private updateHunger() {
        this.hungerContainer.innerHTML = '';
        const hunger = Math.ceil(this.stats.hunger / 2);
        for (let i = 0; i < 10; i++) {
            const icon = document.createElement('div');
            icon.className = 'stat-icon';
            if (i >= hunger) {
                icon.style.backgroundColor = 'rgba(0,0,0,0.5)';
            }
            this.hungerContainer.appendChild(icon);
        }
    }

    private updateXP() {
        this.xpBarInner.style.width = `${this.stats.experienceProgress * 100}%`;
        this.xpLevelText.innerText = this.stats.level > 0 ? this.stats.level.toString() : '';
    }
}
