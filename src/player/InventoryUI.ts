import { Inventory } from './Inventory';
import { BlockType, BLOCK_TEXTURES } from '../world/Block';

import { TextureManager } from '../core/TextureManager';

export class InventoryUI {
    private inventory: Inventory;
    private hotbarElement: HTMLElement;
    private fullInventoryElement: HTMLElement;
    private container: HTMLElement;
    private draggedItem: { index: number, element: HTMLElement } | null = null;

    constructor(inventory: Inventory) {
        this.inventory = inventory;
        this.container = document.getElementById('app')!;
        
        this.createStyles();
        this.hotbarElement = this.createHotbar();
        this.fullInventoryElement = this.createFullInventory();
        
        this.update();
    }

    private createStyles() {
        const atlasURL = TextureManager.getAtlasDataURL();
        const style = document.createElement('style');
        style.textContent = `
            .inventory-slot {
                width: 50px;
                height: 50px;
                background: rgba(0, 0, 0, 0.5);
                border: 2px solid #8b8b8b;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                image-rendering: pixelated;
            }
            .inventory-slot.selected {
                border-color: white;
                box-shadow: inset 0 0 10px white;
            }
            .inventory-item {
                width: 40px;
                height: 40px;
                background-image: url('${atlasURL}');
                background-size: 640px 640px; 
                pointer-events: none;
                background-repeat: no-repeat;
            }
            .item-count {
                position: absolute;
                bottom: 2px;
                right: 4px;
                color: white;
                font-family: 'monospace';
                font-size: 14px;
                text-shadow: 1px 1px 2px black;
                pointer-events: none;
            }
            #hotbar {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 5px;
                background: rgba(0, 0, 0, 0.3);
                padding: 5px;
                border-radius: 4px;
                z-index: 100;
            }
            #full-inventory {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                padding: 20px;
                display: none;
                flex-direction: column;
                gap: 10px;
                border: 4px solid #333;
                z-index: 200;
            }
            .inventory-grid {
                display: grid;
                grid-template-columns: repeat(9, 1fr);
                gap: 5px;
            }
            .inventory-label {
                color: #ddd;
                font-family: sans-serif;
                font-size: 14px;
                margin-bottom: 5px;
            }
        `;
        document.head.appendChild(style);
    }

    private createHotbar(): HTMLElement {
        const hotbar = document.createElement('div');
        hotbar.id = 'hotbar';
        for (let i = 0; i < Inventory.HOTBAR_SIZE; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.index = i.toString();
            hotbar.appendChild(slot);
        }
        this.container.appendChild(hotbar);
        return hotbar;
    }

    private createFullInventory(): HTMLElement {
        const inv = document.createElement('div');
        inv.id = 'full-inventory';
        
        const storageLabel = document.createElement('div');
        storageLabel.className = 'inventory-label';
        storageLabel.innerText = '背包';
        inv.appendChild(storageLabel);

        const storageGrid = document.createElement('div');
        storageGrid.className = 'inventory-grid';
        for (let i = Inventory.HOTBAR_SIZE; i < Inventory.TOTAL_SIZE; i++) {
            const slot = this.createSlotElement(i);
            storageGrid.appendChild(slot);
        }
        inv.appendChild(storageGrid);

        const hotbarLabel = document.createElement('div');
        hotbarLabel.className = 'inventory-label';
        hotbarLabel.innerText = '快捷栏';
        hotbarLabel.style.marginTop = '20px';
        inv.appendChild(hotbarLabel);

        const hotbarGrid = document.createElement('div');
        hotbarGrid.className = 'inventory-grid';
        for (let i = 0; i < Inventory.HOTBAR_SIZE; i++) {
            const slot = this.createSlotElement(i);
            hotbarGrid.appendChild(slot);
        }
        inv.appendChild(hotbarGrid);

        this.container.appendChild(inv);
        return inv;
    }

    private createSlotElement(index: number): HTMLElement {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.index = index.toString();
        
        slot.addEventListener('mousedown', (e) => this.onSlotClick(e, index));
        
        return slot;
    }

    private onSlotClick(e: MouseEvent, index: number) {
        // Simple swap logic for now
        if (this.draggedItem === null) {
            const item = this.inventory.getSlot(index);
            if (item) {
                this.draggedItem = { index, element: e.currentTarget as HTMLElement };
                (e.currentTarget as HTMLElement).style.opacity = '0.5';
            }
        } else {
            this.inventory.swapSlots(this.draggedItem.index, index);
            this.draggedItem.element.style.opacity = '1';
            this.draggedItem = null;
            this.update();
            
            // Dispatch event for Player to update Hand if needed
            window.dispatchEvent(new CustomEvent('inventory-changed'));
        }
    }

    public toggle(show: boolean) {
        this.fullInventoryElement.style.display = show ? 'flex' : 'none';
        if (show) this.update();
    }

    public update() {
        const selectedIdx = this.inventory.getSelectedIndex();
        
        // Update Hotbar
        const hotbarSlots = this.hotbarElement.querySelectorAll('.inventory-slot');
        hotbarSlots.forEach((slot, i) => {
            this.updateSlotContent(slot as HTMLElement, i);
            if (i === selectedIdx) slot.classList.add('selected');
            else slot.classList.remove('selected');
        });

        // Update Full Inventory
        const fullSlots = this.fullInventoryElement.querySelectorAll('.inventory-slot');
        fullSlots.forEach((slot) => {
            const idx = parseInt((slot as HTMLElement).dataset.index!);
            this.updateSlotContent(slot as HTMLElement, idx);
        });
    }

    private updateSlotContent(slot: HTMLElement, index: number) {
        slot.innerHTML = '';
        const item = this.inventory.getSlot(index);
        if (item) {
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';
            
            const texData = BLOCK_TEXTURES[item.type];
            if (texData) {
                // Use side texture for icon, or all if not available
                const uv = texData.textures.side || texData.textures.all || [0, 0];
                const x = uv[0] * 40;
                const y = uv[1] * 40;
                itemEl.style.backgroundPosition = `-${x}px -${y}px`;
            }
            
            slot.appendChild(itemEl);

            if (item.count > 1) {
                const countEl = document.createElement('div');
                countEl.className = 'item-count';
                countEl.innerText = item.count.toString();
                slot.appendChild(countEl);
            }
        }
    }
}
