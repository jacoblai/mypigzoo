import { Inventory, InventoryItem } from './Inventory';
import { BLOCK_TEXTURES } from '../world/Block';

import { TextureManager } from '../core/TextureManager';
import { CraftingSystem, CraftingMatch } from './CraftingSystem';

type SlotKind = 'inventory' | 'crafting';

interface SlotRef {
    kind: SlotKind;
    index: number;
}

export class InventoryUI {
    private inventory: Inventory;
    private hotbarElement: HTMLElement;
    private fullInventoryElement: HTMLElement;
    private container: HTMLElement;
    private cursorItem: InventoryItem | null = null;
    private cursorSource: SlotRef | null = null;
    private craftingSlots: (InventoryItem | null)[] = new Array(CraftingSystem.GRID_SIZE * CraftingSystem.GRID_SIZE).fill(null);
    private craftingOutputElement!: HTMLElement;
    private lastClickTime = 0;
    private lastClickSlot: SlotRef | null = null;

    constructor(inventory: Inventory) {
        this.inventory = inventory;
        this.container = document.getElementById('app')!;
        
        this.createStyles();
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());
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
            .crafting-container {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .crafting-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 5px;
            }
            .crafting-output {
                margin-left: 8px;
            }
            .crafting-arrow {
                color: #ddd;
                font-family: sans-serif;
                font-size: 18px;
                padding: 0 4px;
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

        const craftingLabel = document.createElement('div');
        craftingLabel.className = 'inventory-label';
        craftingLabel.innerText = '合成';
        inv.appendChild(craftingLabel);

        const craftingContainer = document.createElement('div');
        craftingContainer.className = 'crafting-container';

        const craftingGrid = document.createElement('div');
        craftingGrid.className = 'crafting-grid';
        for (let i = 0; i < CraftingSystem.GRID_SIZE * CraftingSystem.GRID_SIZE; i++) {
            const slot = this.createSlotElement(i, 'crafting');
            craftingGrid.appendChild(slot);
        }
        craftingContainer.appendChild(craftingGrid);

        const arrow = document.createElement('div');
        arrow.className = 'crafting-arrow';
        arrow.innerText = '→';
        craftingContainer.appendChild(arrow);

        this.craftingOutputElement = document.createElement('div');
        this.craftingOutputElement.className = 'inventory-slot crafting-output';
        this.craftingOutputElement.addEventListener('mousedown', (e) => this.onOutputClick(e));
        craftingContainer.appendChild(this.craftingOutputElement);

        inv.appendChild(craftingContainer);
        
        const storageLabel = document.createElement('div');
        storageLabel.className = 'inventory-label';
        storageLabel.innerText = '背包';
        inv.appendChild(storageLabel);

        const storageGrid = document.createElement('div');
        storageGrid.className = 'inventory-grid';
        for (let i = Inventory.HOTBAR_SIZE; i < Inventory.TOTAL_SIZE; i++) {
            const slot = this.createSlotElement(i, 'inventory');
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
            const slot = this.createSlotElement(i, 'inventory');
            hotbarGrid.appendChild(slot);
        }
        inv.appendChild(hotbarGrid);

        this.container.appendChild(inv);
        return inv;
    }

    private createSlotElement(index: number, kind: SlotKind): HTMLElement {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.index = index.toString();
        slot.dataset.kind = kind;
        
        slot.addEventListener('mousedown', (e) => this.onSlotClick(e, { kind, index }));
        
        return slot;
    }

    private onSlotClick(e: MouseEvent, slot: SlotRef) {
        e.preventDefault();
        const isRightClick = e.button === 2 || (e.button === 0 && e.ctrlKey);
        const isLeftClick = e.button === 0;
        let inventoryChanged = false;

        if (isLeftClick && e.shiftKey && this.cursorItem === null) {
            if (this.handleShiftMove(slot)) {
                window.dispatchEvent(new CustomEvent('inventory-changed'));
            }
            this.update();
            return;
        }

        if (isLeftClick && this.cursorItem === null && this.isDoubleClick(slot)) {
            if (this.mergeStacks(slot)) {
                window.dispatchEvent(new CustomEvent('inventory-changed'));
            }
            this.update();
            return;
        }

        this.recordClick(slot);

        const targetItem = this.getSlotItem(slot);

        if (this.cursorItem === null) {
            if (!targetItem) return;
            const takeCount = isRightClick ? Math.ceil(targetItem.count / 2) : targetItem.count;
            this.cursorItem = { type: targetItem.type, count: takeCount };
            this.cursorSource = slot;

            if (takeCount === targetItem.count) {
                this.setSlotItem(slot, null);
            } else {
                this.setSlotItem(slot, { type: targetItem.type, count: targetItem.count - takeCount });
            }

            inventoryChanged = slot.kind === 'inventory';
            this.update();
        } else {
            if (isRightClick) {
                if (!targetItem) {
                    this.setSlotItem(slot, { type: this.cursorItem.type, count: 1 });
                    this.cursorItem.count -= 1;
                } else if (targetItem.type === this.cursorItem.type && targetItem.count < Inventory.MAX_STACK) {
                    this.setSlotItem(slot, { type: targetItem.type, count: targetItem.count + 1 });
                    this.cursorItem.count -= 1;
                }
            } else if (isLeftClick) {
                if (!targetItem) {
                    this.setSlotItem(slot, this.cursorItem);
                    this.cursorItem = null;
                    this.cursorSource = null;
                } else if (targetItem.type === this.cursorItem.type) {
                    const space = Inventory.MAX_STACK - targetItem.count;
                    const moved = Math.min(space, this.cursorItem.count);
                    if (moved > 0) {
                        this.setSlotItem(slot, { type: targetItem.type, count: targetItem.count + moved });
                        this.cursorItem.count -= moved;
                    }
                } else {
                    this.setSlotItem(slot, this.cursorItem);
                    this.cursorItem = targetItem;
                    this.cursorSource = slot;
                }
            }

            if (this.cursorItem && this.cursorItem.count <= 0) {
                this.cursorItem = null;
                this.cursorSource = null;
            }

            inventoryChanged = slot.kind === 'inventory';
            this.update();
        }

        if (inventoryChanged) {
            window.dispatchEvent(new CustomEvent('inventory-changed'));
        }
    }

    public toggle(show: boolean) {
        this.fullInventoryElement.style.display = show ? 'flex' : 'none';
        if (show) {
            this.update();
            return;
        }

        this.restoreCursorItem();
        this.returnCraftingItems();
        this.update();
    }

    public update() {
        const selectedIdx = this.inventory.getSelectedIndex();
        
        // Update Hotbar
        const hotbarSlots = this.hotbarElement.querySelectorAll('.inventory-slot');
        hotbarSlots.forEach((slot, i) => {
            this.updateSlotContent(slot as HTMLElement, this.inventory.getSlot(i));
            if (i === selectedIdx) slot.classList.add('selected');
            else slot.classList.remove('selected');
        });

        // Update Full Inventory
        const fullSlots = this.fullInventoryElement.querySelectorAll('.inventory-slot');
        fullSlots.forEach((slot) => {
            const element = slot as HTMLElement;
            const kind = element.dataset.kind as SlotKind | undefined;
            const idx = element.dataset.index ? parseInt(element.dataset.index) : -1;
            if (kind === 'inventory' && idx >= 0) {
                this.updateSlotContent(element, this.inventory.getSlot(idx));
            } else if (kind === 'crafting' && idx >= 0) {
                this.updateSlotContent(element, this.craftingSlots[idx]);
            }
        });

        this.updateCraftingOutput();
    }

    private updateSlotContent(slot: HTMLElement, item: InventoryItem | null) {
        slot.innerHTML = '';
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

    private updateCraftingOutput() {
        this.updateSlotContent(this.craftingOutputElement, null);
        const match = CraftingSystem.findMatch(this.craftingSlots);
        if (!match) return;
        this.updateSlotContent(this.craftingOutputElement, match.output);
    }

    private onOutputClick(e: MouseEvent) {
        e.preventDefault();
        if (this.cursorItem) return;

        const match = CraftingSystem.findMatch(this.craftingSlots);
        if (!match) return;

        if (!this.inventory.canAddItem(match.output.type, match.output.count)) return;

        this.inventory.addItem(match.output.type, match.output.count);
        this.consumeCraftingInputs(match);
        this.update();
        window.dispatchEvent(new CustomEvent('inventory-changed'));
    }

    private consumeCraftingInputs(match: CraftingMatch) {
        for (const index of match.consumeIndices) {
            const item = this.craftingSlots[index];
            if (!item) continue;
            item.count -= 1;
            if (item.count <= 0) {
                this.craftingSlots[index] = null;
            }
        }
    }

    private getSlotItem(slot: SlotRef): InventoryItem | null {
        if (slot.kind === 'inventory') return this.inventory.getSlot(slot.index);
        return this.craftingSlots[slot.index] ?? null;
    }

    private setSlotItem(slot: SlotRef, item: InventoryItem | null) {
        if (slot.kind === 'inventory') {
            this.inventory.setSlot(slot.index, item);
        } else {
            this.craftingSlots[slot.index] = item;
        }
    }

    private restoreCursorItem() {
        if (!this.cursorItem) return;
        if (this.cursorSource && this.canPlaceAllInSlot(this.cursorSource, this.cursorItem)) {
            const target = this.getSlotItem(this.cursorSource);
            if (!target) {
                this.setSlotItem(this.cursorSource, this.cursorItem);
            } else {
                this.setSlotItem(this.cursorSource, {
                    type: target.type,
                    count: target.count + this.cursorItem.count
                });
            }
            this.cursorItem = null;
            this.cursorSource = null;
            return;
        }

        const remaining = this.inventory.addItem(this.cursorItem.type, this.cursorItem.count);
        if (remaining <= 0) {
            this.cursorItem = null;
            this.cursorSource = null;
            return;
        }

        if (this.cursorSource) {
            const target = this.getSlotItem(this.cursorSource);
            if (!target) {
                this.setSlotItem(this.cursorSource, { type: this.cursorItem.type, count: remaining });
                this.cursorItem = null;
                this.cursorSource = null;
                return;
            }
        }

        this.cursorItem = null;
        this.cursorSource = null;
    }

    private returnCraftingItems() {
        for (let i = 0; i < this.craftingSlots.length; i++) {
            const item = this.craftingSlots[i];
            if (!item) continue;
            const remaining = this.inventory.addItem(item.type, item.count);
            if (remaining === 0) {
                this.craftingSlots[i] = null;
            } else {
                this.craftingSlots[i] = { type: item.type, count: remaining };
            }
        }
        window.dispatchEvent(new CustomEvent('inventory-changed'));
    }

    private canPlaceAllInSlot(slot: SlotRef, item: InventoryItem): boolean {
        const target = this.getSlotItem(slot);
        if (!target) return true;
        if (target.type !== item.type) return false;
        return target.count + item.count <= Inventory.MAX_STACK;
    }

    private isDoubleClick(slot: SlotRef): boolean {
        const now = Date.now();
        const isSameSlot =
            this.lastClickSlot &&
            this.lastClickSlot.kind === slot.kind &&
            this.lastClickSlot.index === slot.index;
        return isSameSlot && now - this.lastClickTime <= 250;
    }

    private recordClick(slot: SlotRef) {
        this.lastClickTime = Date.now();
        this.lastClickSlot = slot;
    }

    private mergeStacks(slot: SlotRef): boolean {
        const target = this.getSlotItem(slot);
        if (!target || target.count >= Inventory.MAX_STACK) return false;

        let remaining = Inventory.MAX_STACK - target.count;
        const donorSlots = slot.kind === 'crafting'
            ? this.getCraftingIndices()
            : this.getInventoryIndices();

        for (const index of donorSlots) {
            if (remaining <= 0) break;
            if (slot.kind === 'crafting' && index === slot.index) continue;
            if (slot.kind === 'inventory' && index === slot.index) continue;

            const donorSlot = slot.kind === 'crafting'
                ? this.craftingSlots[index]
                : this.inventory.getSlot(index);

            if (!donorSlot || donorSlot.type !== target.type) continue;

            const moved = Math.min(remaining, donorSlot.count);
            remaining -= moved;
            target.count += moved;
            donorSlot.count -= moved;

            if (donorSlot.count <= 0) {
                if (slot.kind === 'crafting') {
                    this.craftingSlots[index] = null;
                } else {
                    this.inventory.setSlot(index, null);
                }
            } else if (slot.kind === 'inventory') {
                this.inventory.setSlot(index, { type: donorSlot.type, count: donorSlot.count });
            }
        }

        this.setSlotItem(slot, target);
        return slot.kind === 'inventory';
    }

    private handleShiftMove(slot: SlotRef): boolean {
        if (slot.kind === 'crafting') {
            const item = this.craftingSlots[slot.index];
            if (!item) return false;
            const remaining = this.inventory.addItem(item.type, item.count);
            if (remaining <= 0) {
                this.craftingSlots[slot.index] = null;
            } else {
                this.craftingSlots[slot.index] = { type: item.type, count: remaining };
            }
            return true;
        }

        const item = this.inventory.getSlot(slot.index);
        if (!item) return false;

        const targetIndices = slot.index < Inventory.HOTBAR_SIZE
            ? this.getStorageIndices()
            : this.getHotbarIndices();

        const remaining = this.moveItemToIndices(item, targetIndices);
        if (remaining <= 0) {
            this.inventory.setSlot(slot.index, null);
        } else {
            this.inventory.setSlot(slot.index, { type: item.type, count: remaining });
        }

        return true;
    }

    private moveItemToIndices(item: InventoryItem, indices: number[]): number {
        let remaining = item.count;

        for (const index of indices) {
            if (remaining <= 0) break;
            const slotItem = this.inventory.getSlot(index);
            if (!slotItem || slotItem.type !== item.type || slotItem.count >= Inventory.MAX_STACK) continue;
            const addable = Math.min(remaining, Inventory.MAX_STACK - slotItem.count);
            if (addable <= 0) continue;
            slotItem.count += addable;
            remaining -= addable;
            this.inventory.setSlot(index, { type: slotItem.type, count: slotItem.count });
        }

        for (const index of indices) {
            if (remaining <= 0) break;
            const slotItem = this.inventory.getSlot(index);
            if (slotItem) continue;
            const addable = Math.min(remaining, Inventory.MAX_STACK);
            this.inventory.setSlot(index, { type: item.type, count: addable });
            remaining -= addable;
        }

        return remaining;
    }

    private getHotbarIndices(): number[] {
        return Array.from({ length: Inventory.HOTBAR_SIZE }, (_, i) => i);
    }

    private getStorageIndices(): number[] {
        return Array.from(
            { length: Inventory.STORAGE_SIZE },
            (_, i) => i + Inventory.HOTBAR_SIZE
        );
    }

    private getInventoryIndices(): number[] {
        return Array.from({ length: Inventory.TOTAL_SIZE }, (_, i) => i);
    }

    private getCraftingIndices(): number[] {
        return Array.from(
            { length: CraftingSystem.GRID_SIZE * CraftingSystem.GRID_SIZE },
            (_, i) => i
        );
    }
}
