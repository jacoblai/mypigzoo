import { BlockType, BLOCK_DATA } from '../world/Block';
import { Inventory } from '../player/Inventory';
import { EntityManager } from '../world/EntityManager';
import { World } from '../world/World';
import * as THREE from 'three';

export interface CommandContext {
    inventory: Inventory;
    entityManager: EntityManager;
    world: World;
    position: THREE.Vector3;
    direction: THREE.Vector3;
}

export class CommandSystem {
    public execute(commandLine: string, context: CommandContext): string {
        if (!commandLine.startsWith('/')) {
            return 'Invalid command. Commands must start with /';
        }

        const parts = commandLine.slice(1).split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (command) {
            case 'give':
                return this.handleGive(args, context);
            case 'summon':
                return this.handleSummon(args, context);
            case 'help':
                return 'Available: /give <targets> <item> [count], /summon <entity>, /help';
            default:
                return `Unknown command: ${command}`;
        }
    }

    private handleSummon(args: string[], context: CommandContext): string {
        if (args.length < 1) {
            return 'Usage: /summon <entity_name>';
        }

        const entityName = args[0].toLowerCase();
        if (entityName === 'pig') {
            // Attempt to find a ground position in front of the player
            let spawnPos = context.position.clone();
            const forward = context.direction.clone();
            
            // Try to find ground using raycast
            const hit = context.world.getVoxel(context.position.x, context.position.y, context.position.z);
            
            // Spawn 3 blocks in front, but keep at player's height or ground height
            const horizontalForward = forward.clone().setY(0).normalize();
            spawnPos.add(horizontalForward.multiplyScalar(3));
            
            // Important: Get ground height at the target horizontal position
            const groundY = context.world.getHighestSolidBlock(spawnPos.x, spawnPos.z);
            
            // If ground is found, spawn there. Otherwise stay at player height.
            if (groundY > 0) {
                spawnPos.y = groundY;
            }

            context.entityManager.spawnPig(spawnPos.x, spawnPos.y, spawnPos.z);
            return `Summoned a new pig at [${Math.floor(spawnPos.x)}, ${Math.floor(spawnPos.y)}, ${Math.floor(spawnPos.z)}]`;
        }
        return `Unknown entity: ${entityName}`;
    }

    private handleGive(args: string[], context: CommandContext): string {
        // Minecraft syntax: /give <targets> <item> [count]
        if (args.length < 2) {
            if (args.length === 1 && !args[0].startsWith('@')) {
                return this.performGive('@s', args[0], 64, context.inventory);
            }
            return 'Usage: /give <targets> <item> [count]';
        }

        const selector = args[0];
        const itemName = args[1].toLowerCase();
        const amount = args.length >= 3 ? parseInt(args[2]) : 64;

        return this.performGive(selector, itemName, amount, context.inventory);
    }

    private performGive(selector: string, itemName: string, amount: number, inventory: Inventory): string {
        if (isNaN(amount) || amount <= 0) {
            return 'Invalid amount.';
        }

        const validSelectors = ['@s', '@p', '@a'];
        if (selector.startsWith('@') && !validSelectors.includes(selector)) {
            return `Unknown selector: ${selector}`;
        }

        let targetType: BlockType | null = null;
        for (const [type, data] of Object.entries(BLOCK_DATA)) {
            const normalizedName = data.name.toLowerCase().replace(/\s+/g, '_');
            const simpleName = data.name.toLowerCase();
            
            if (normalizedName === itemName || simpleName === itemName) {
                targetType = parseInt(type) as BlockType;
                break;
            }
        }

        if (targetType === null) {
            return `Unknown item: ${itemName}`;
        }

        inventory.addItem(targetType, amount);
        window.dispatchEvent(new CustomEvent('inventory-changed'));

        return `Gave ${amount} [${BLOCK_DATA[targetType].name}] to ${selector === '@a' ? 'all players' : 'player'}`;
    }
}
