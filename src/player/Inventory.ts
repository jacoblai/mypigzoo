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

    constructor() {
        // Initial items for testing
        this.slots[0] = { type: BlockType.GRASS, count: 64 };
        this.slots[1] = { type: BlockType.DIRT, count: 32 };
        this.slots[2] = { type: BlockType.STONE, count: 16 };
    }

    public getSelectedSlot(): InventoryItem | null {
        return this.slots[this.selectedIndex];
    }

    public getSelectedIndex(): number {
        return this.selectedIndex;
    }

    public select(index: number) {
        if (index >= 0 && index < Inventory.HOTBAR_SIZE) {
            this.selectedIndex = index;
        }
    }

    public next() {
        this.selectedIndex = (this.selectedIndex + 1) % Inventory.HOTBAR_SIZE;
    }

    public prev() {
        this.selectedIndex = (this.selectedIndex - 1 + Inventory.HOTBAR_SIZE) % Inventory.HOTBAR_SIZE;
    }

    /**
     * Adds an item to the inventory, handling stacking.
     * @returns The number of items that couldn't be added.
     */
    public addItem(type: BlockType, count: number = 1): number {
        if (type === BlockType.AIR) return 0;

        let remaining = count;

        // 1. Try to stack in existing slots
        for (let i = 0; i < Inventory.TOTAL_SIZE; i++) {
            const slot = this.slots[i];
            if (slot && slot.type === type && slot.count < Inventory.MAX_STACK) {
                const addable = Math.min(remaining, Inventory.MAX_STACK - slot.count);
                slot.count += addable;
                remaining -= addable;
                if (remaining <= 0) return 0;
            }
        }

        // 2. Try to find empty slots
        for (let i = 0; i < Inventory.TOTAL_SIZE; i++) {
            if (this.slots[i] === null) {
                const addable = Math.min(remaining, Inventory.MAX_STACK);
                this.slots[i] = { type, count: addable };
                remaining -= addable;
                if (remaining <= 0) return 0;
            }
        }

        return remaining;
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
        return true;
    }

    public getSlot(index: number): InventoryItem | null {
        return this.slots[index];
    }

    public setSlot(index: number, item: InventoryItem | null) {
        if (index >= 0 && index < Inventory.TOTAL_SIZE) {
            this.slots[index] = item;
        }
    }

    public swapSlots(indexA: number, indexB: number) {
        const temp = this.slots[indexA];
        this.slots[indexA] = this.slots[indexB];
        this.slots[indexB] = temp;
    }
}
