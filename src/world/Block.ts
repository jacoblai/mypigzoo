export enum BlockType {
    AIR = 0,
    DIRT = 1,
    GRASS = 2,
    STONE = 3,
}

// UV mapping for a 16x16 atlas (grid coordinates 0-15)
// Each face can have a different texture
export const BLOCK_TEXTURES: Record<number, {
    all?: [number, number],
    top?: [number, number],
    bottom?: [number, number],
    side?: [number, number],
}> = {
    [BlockType.DIRT]: { all: [2, 0] },
    [BlockType.GRASS]: {
        top: [0, 0],
        bottom: [2, 0],
        side: [1, 0]
    },
    [BlockType.STONE]: { all: [3, 0] },
};

// For backward compatibility or debugging
export const BLOCK_COLORS: Record<number, number> = {
    [BlockType.DIRT]: 0x8b4513,
    [BlockType.GRASS]: 0x228b22,
    [BlockType.STONE]: 0x808080,
};
