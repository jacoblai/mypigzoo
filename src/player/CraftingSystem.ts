import { BlockType } from '../world/Block';
import { InventoryItem } from './Inventory';

export type Ingredient = BlockType | BlockType[] | null;

export interface CraftingRecipe {
    width: number;
    height: number;
    pattern: Ingredient[];
    output: InventoryItem;
}

export interface CraftingMatch {
    output: InventoryItem;
    consumeIndices: number[];
}

export class CraftingSystem {
    public static readonly GRID_SIZE = 3;

    private static readonly recipes: CraftingRecipe[] = [
        {
            width: 1,
            height: 1,
            pattern: [[BlockType.OAK_LOG, BlockType.BIRCH_LOG]],
            output: { type: BlockType.PLANKS, count: 4 }
        },
        {
            width: 1,
            height: 2,
            pattern: [BlockType.PLANKS, BlockType.PLANKS],
            output: { type: BlockType.STICK, count: 4 }
        },
        {
            width: 3,
            height: 3,
            pattern: [
                BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS,
                null, BlockType.STICK, null,
                null, BlockType.STICK, null
            ],
            output: { type: BlockType.WOODEN_PICKAXE, count: 1 }
        },
        {
            width: 3,
            height: 3,
            pattern: [
                BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE,
                null, BlockType.STICK, null,
                null, BlockType.STICK, null
            ],
            output: { type: BlockType.STONE_PICKAXE, count: 1 }
        }
    ];

    public static findMatch(grid: (InventoryItem | null)[]): CraftingMatch | null {
        if (grid.length !== this.GRID_SIZE * this.GRID_SIZE) return null;

        const gridTypes = grid.map(item => item?.type ?? null);

        for (const recipe of this.recipes) {
            const maxOffsetX = this.GRID_SIZE - recipe.width;
            const maxOffsetY = this.GRID_SIZE - recipe.height;

            for (let offsetY = 0; offsetY <= maxOffsetY; offsetY++) {
                for (let offsetX = 0; offsetX <= maxOffsetX; offsetX++) {
                    const match = this.matchAt(gridTypes, recipe, offsetX, offsetY);
                    if (match) {
                        return { output: { ...recipe.output }, consumeIndices: match };
                    }
                }
            }
        }

        return null;
    }

    private static matchAt(
        grid: (BlockType | null)[],
        recipe: CraftingRecipe,
        offsetX: number,
        offsetY: number
    ): number[] | null {
        const consumeIndices: number[] = [];

        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const gridIndex = y * this.GRID_SIZE + x;
                const gridType = grid[gridIndex];

                const inRecipeArea =
                    x >= offsetX &&
                    x < offsetX + recipe.width &&
                    y >= offsetY &&
                    y < offsetY + recipe.height;

                if (!inRecipeArea) {
                    if (gridType !== null) return null;
                    continue;
                }

                const recipeIndex = (y - offsetY) * recipe.width + (x - offsetX);
                const ingredient = recipe.pattern[recipeIndex] ?? null;

                if (ingredient === null) {
                    if (gridType !== null) return null;
                    continue;
                }

                if (gridType === null) return null;
                if (!this.ingredientMatches(ingredient, gridType)) return null;

                consumeIndices.push(gridIndex);
            }
        }

        return consumeIndices;
    }

    private static ingredientMatches(ingredient: Ingredient, type: BlockType): boolean {
        if (ingredient === null) return false;
        if (Array.isArray(ingredient)) return ingredient.includes(type);
        return ingredient === type;
    }
}
