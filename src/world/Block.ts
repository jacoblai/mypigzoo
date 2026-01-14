export enum BlockType {
    AIR = 0,
    
    // Natural Blocks
    STONE = 1,
    COBBLESTONE = 2,
    GRASS = 3,
    DIRT = 4,
    SAND = 5,
    GRAVEL = 6,
    BEDROCK = 7,
    
    // Wood & Leaves
    OAK_LOG = 10,
    OAK_LEAVES = 11,
    BIRCH_LOG = 12,
    BIRCH_LEAVES = 13,
    
    // Ores
    COAL_ORE = 20,
    IRON_ORE = 21,
    GOLD_ORE = 22,
    DIAMOND_ORE = 23,
    
    // Building Blocks
    PLANKS = 30,
    GLASS = 31,
    BRICKS = 32,
    
    // Decoration
    TALL_GRASS = 40,
    DANDELION = 41,
    ROSE = 42,
    CARROT = 43,

    // Fluids
    WATER = 50,
}

export enum RenderType {
    CUBE = 0,
    TRANSPARENT = 1, // Full cube but transparent (e.g. glass)
    CROSS = 2,       // Two intersecting planes (e.g. grass, flowers)
    LEAVES = 3,      // Special rendering for leaves (culling behavior)
}

export interface BlockData {
    name: string;
    renderType: RenderType;
    isOpaque: boolean;
    isSolid: boolean; // 新增：是否具有物理碰撞
    hardness: number;
    // Texture coordinates in the 16x16 grid [x, y]
    textures: {
        all?: [number, number];
        top?: [number, number];
        bottom?: [number, number];
        side?: [number, number];
    };
    isEdible?: boolean;
    nutrition?: number;
    saturation?: number;
}

export const BLOCK_DATA: Record<number, BlockData> = {
    [BlockType.STONE]: {
        name: 'Stone',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 1.5,
        textures: { all: [3, 0] }
    },
    [BlockType.COBBLESTONE]: {
        name: 'Cobblestone',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 2.0,
        textures: { all: [0, 1] }
    },
    [BlockType.GRASS]: {
        name: 'Grass',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 0.6,
        textures: { top: [0, 0], bottom: [2, 0], side: [1, 0] },
        isEdible: true,
        nutrition: 2,
        saturation: 1.2
    },
    [BlockType.DIRT]: {
        name: 'Dirt',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 0.5,
        textures: { all: [2, 0] }
    },
    [BlockType.SAND]: {
        name: 'Sand',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 0.5,
        textures: { all: [2, 1] }
    },
    [BlockType.GRAVEL]: {
        name: 'Gravel',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 0.6,
        textures: { all: [3, 1] }
    },
    [BlockType.BEDROCK]: {
        name: 'Bedrock',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: -1, // Unbreakable
        textures: { all: [1, 1] }
    },
    [BlockType.OAK_LOG]: {
        name: 'Oak Log',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 2.0,
        textures: { top: [5, 1], bottom: [5, 1], side: [4, 1] }
    },
    [BlockType.OAK_LEAVES]: {
        name: 'Oak Leaves',
        renderType: RenderType.LEAVES,
        isOpaque: false,
        isSolid: true,
        hardness: 0.2,
        textures: { all: [4, 3] }
    },
    [BlockType.COAL_ORE]: {
        name: 'Coal Ore',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 3.0,
        textures: { all: [2, 2] }
    },
    [BlockType.IRON_ORE]: {
        name: 'Iron Ore',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 3.0,
        textures: { all: [1, 2] }
    },
    [BlockType.GOLD_ORE]: {
        name: 'Gold Ore',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 3.0,
        textures: { all: [0, 2] }
    },
    [BlockType.DIAMOND_ORE]: {
        name: 'Diamond Ore',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 3.0,
        textures: { all: [2, 3] }
    },
    [BlockType.PLANKS]: {
        name: 'Planks',
        renderType: RenderType.CUBE,
        isOpaque: true,
        isSolid: true,
        hardness: 2.0,
        textures: { all: [4, 0] }
    },
    [BlockType.GLASS]: {
        name: 'Glass',
        renderType: RenderType.TRANSPARENT,
        isOpaque: false,
        isSolid: true,
        hardness: 0.3,
        textures: { all: [1, 3] }
    },
    [BlockType.TALL_GRASS]: {
        name: 'Tall Grass',
        renderType: RenderType.CROSS,
        isOpaque: false,
        isSolid: false,
        hardness: 0,
        textures: { all: [7, 2] }
    },
    [BlockType.DANDELION]: {
        name: 'Dandelion',
        renderType: RenderType.CROSS,
        isOpaque: false,
        isSolid: false,
        hardness: 0,
        textures: { all: [13, 0] }
    },
    [BlockType.ROSE]: {
        name: 'Rose',
        renderType: RenderType.CROSS,
        isOpaque: false,
        isSolid: false,
        hardness: 0,
        textures: { all: [12, 0] }
    },
    [BlockType.CARROT]: {
        name: 'Carrot',
        renderType: RenderType.CROSS,
        isOpaque: false,
        isSolid: false,
        hardness: 0,
        textures: { all: [12, 5] }, // Placeholder texture coordinate
        isEdible: true,
        nutrition: 3,
        saturation: 2.4
    },
    [BlockType.WATER]: {
        name: 'Water',
        renderType: RenderType.TRANSPARENT,
        isOpaque: false,
        isSolid: false,
        hardness: 100, // Unbreakable but not solid
        textures: { all: [14, 0] }
    },
};

// Compatibility export
export const BLOCK_TEXTURES = BLOCK_DATA;
