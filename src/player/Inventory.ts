import { BlockType } from '../world/Block';

export interface InventoryItem {
    type: BlockType;
    count: number;
}

export class Inventory {
    public static readonly HOTBAR_SIZE = 9;
    public static readonly STORAGE_SIZE = 27;
    public static readonly TOTAL_SIZE = Inventory.HOTBAR_SIZE + Inventory.STORAGE_SIZE;
    public static readonly MAX_STACK = 64;

    private slots: (InventoryItem | null)[] = new Array(Inventory.TOTAL_SIZE).fill(null);
    private selectedIndex: number = 0;
    private changeListeners: Set<() => void> = new Set();

    constructor() {
        // Start with an empty inventory
    }

    public getSelectedSlot(): InventoryItem | null {
        return this.slots[this.selectedIndex];
    }

    public getSelectedIndex(): number {
        return this.selectedIndex;
    }

    public select(index: number) {
        if (index >= 0 && index < Inventory.HOTBAR_SIZE) {
            if (this.selectedIndex === index) return;
            this.selectedIndex = index;
            this.emitChange();
        }
    }

    public next() {
        this.selectedIndex = (this.selectedIndex + 1) % Inventory.HOTBAR_SIZE;
        this.emitChange();
    }

    public prev() {
        this.selectedIndex = (this.selectedIndex - 1 + Inventory.HOTBAR_SIZE) % Inventory.HOTBAR_SIZE;
        this.emitChange();
    }

    /**
     * Adds an item to the inventory, handling stacking.
     * @returns The number of items that couldn't be added.
     */
    public addItem(type: BlockType, count: number = 1): number {
        if (type === BlockType.AIR) return 0;

        let remaining = count;
        let changed = false;

        // 1. Try to stack in existing slots
        for (let i = 0; i < Inventory.TOTAL_SIZE; i++) {
            const slot = this.slots[i];
            if (slot && slot.type === type && slot.count < Inventory.MAX_STACK) {
                const addable = Math.min(remaining, Inventory.MAX_STACK - slot.count);
                slot.count += addable;
                remaining -= addable;
                changed = true;
                if (remaining <= 0) {
                    this.emitChange();
                    return 0;
                }
            }
        }

        // 2. Try to find empty slots
        for (let i = 0; i < Inventory.TOTAL_SIZE; i++) {
            if (this.slots[i] === null) {
                const addable = Math.min(remaining, Inventory.MAX_STACK);
                this.slots[i] = { type, count: addable };
                remaining -= addable;
                changed = true;
                if (remaining <= 0) {
                    this.emitChange();
                    return 0;
                }
            }
        }

        if (changed) this.emitChange();
        return remaining;
    }

    public canAddItem(type: BlockType, count: number = 1): boolean {
        if (type === BlockType.AIR) return true;

        let remaining = count;

        for (let i = 0; i < Inventory.TOTAL_SIZE; i++) {
            const slot = this.slots[i];
            if (slot && slot.type === type && slot.count < Inventory.MAX_STACK) {
                const addable = Math.min(remaining, Inventory.MAX_STACK - slot.count);
                remaining -= addable;
                if (remaining <= 0) return true;
            }
        }

        for (let i = 0; i < Inventory.TOTAL_SIZE; i++) {
            if (this.slots[i] === null) {
                const addable = Math.min(remaining, Inventory.MAX_STACK);
                remaining -= addable;
                if (remaining <= 0) return true;
            }
        }

        return remaining <= 0;
    }

    /**
     * Removes items from the current selected slot.
     */
    public consumeSelected(count: number = 1): boolean {
        const slot = this.slots[this.selectedIndex];
        if (!slot || slot.count < count) return false;

        slot.count -= count;
        if (slot.count <= 0) {
            this.slots[this.selectedIndex] = null;
        }
        this.emitChange();
        return true;
    }

    public getSlot(index: number): InventoryItem | null {
        return this.slots[index];
    }

    public setSlot(index: number, item: InventoryItem | null) {
        if (index >= 0 && index < Inventory.TOTAL_SIZE) {
            this.slots[index] = item;
            this.emitChange();
        }
    }

    public swapSlots(indexA: number, indexB: number) {
        const temp = this.slots[indexA];
        this.slots[indexA] = this.slots[indexB];
        this.slots[indexB] = temp;
        this.emitChange();
    }

    public subscribe(listener: () => void): () => void {
        this.changeListeners.add(listener);
        return () => {
            this.changeListeners.delete(listener);
        };
    }

    private emitChange() {
        for (const listener of this.changeListeners) {
            listener();
        }
    }
}
