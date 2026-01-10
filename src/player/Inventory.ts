import { BlockType } from '../world/Block';

export class Inventory {
    private blocks: BlockType[] = [BlockType.STONE, BlockType.GRASS, BlockType.DIRT];
    private selectedIndex: number = 0;

    public getSelectedBlock(): BlockType {
        return this.blocks[this.selectedIndex];
    }

    public next() {
        this.selectedIndex = (this.selectedIndex + 1) % this.blocks.length;
    }

    public prev() {
        this.selectedIndex = (this.selectedIndex - 1 + this.blocks.length) % this.blocks.length;
    }

    public select(index: number) {
        if (index >= 0 && index < this.blocks.length) {
            this.selectedIndex = index;
        }
    }
}
