export class PlayerStats {
    // Health (0-20, where 20 = 10 hearts)
    public health: number = 20;
    public maxHealth: number = 20;

    // Hunger (0-20, where 20 = 10 drumsticks)
    public hunger: number = 20;
    public maxHunger: number = 20;

    // Saturation (hidden value, depleted before hunger)
    public saturation: number = 5;
    
    // Exhaustion (0-4, when reaching 4, reduces saturation/hunger and resets to 0)
    public exhaustion: number = 0;

    // Experience
    public level: number = 0;
    public experienceProgress: number = 0; // 0 to 1
    public totalExperience: number = 0;

    // Internal timers
    private regenTimer: number = 0;
    private starvationTimer: number = 0;

    public onDamage?: (amount: number) => void;

    constructor() {}

    public update(delta: number) {
        // 1. Handle Exhaustion -> Hunger/Saturation conversion
        if (this.exhaustion >= 4.0) {
            this.exhaustion -= 4.0;
            if (this.saturation > 0) {
                this.saturation = Math.max(0, this.saturation - 1);
            } else {
                this.hunger = Math.max(0, this.hunger - 1);
            }
        }

        // 2. Natural Regeneration
        this.regenTimer += delta;
        if (this.regenTimer >= 2.0) { // Every 2 seconds
            this.regenTimer = 0;
            
            // Fast regen when very full (Minecraft 1.11+)
            if (this.hunger >= 20 && this.saturation > 0 && this.health < this.maxHealth) {
                this.heal(1);
                this.addExhaustion(6.0); // Healing costs a lot of exhaustion
            } 
            // Normal regen when hunger is high
            else if (this.hunger >= 18 && this.health < this.maxHealth) {
                this.heal(1);
                this.addExhaustion(6.0);
            }
        }

        // 3. Starvation
        if (this.hunger <= 0) {
            this.starvationTimer += delta;
            if (this.starvationTimer >= 4.0) {
                this.starvationTimer = 0;
                // Starve down to 1 health (Normal difficulty style)
                if (this.health > 1) {
                    this.damage(1);
                }
            }
        } else {
            this.starvationTimer = 0;
        }
    }

    public addExhaustion(value: number) {
        this.exhaustion += value;
    }

    public damage(amount: number) {
        this.health = Math.max(0, this.health - amount);
        // Reset regen timer on damage to prevent immediate regen
        this.regenTimer = -1.0; 
        
        if (this.onDamage) {
            this.onDamage(amount);
        }
    }

    public heal(amount: number) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    public eat(hungerRestored: number, saturationRestored: number) {
        this.hunger = Math.min(this.maxHunger, this.hunger + hungerRestored);
        this.saturation = Math.min(this.hunger, this.saturation + saturationRestored);
    }

    public addExperience(points: number) {
        this.totalExperience += points;
        this.calculateLevel();
    }

    private calculateLevel() {
        // Minecraft-like level formula
        // This is a simplified version
        let points = this.totalExperience;
        let lvl = 0;
        
        while (true) {
            const nextLevelRequirement = this.getExpToNextLevel(lvl);
            if (points >= nextLevelRequirement) {
                points -= nextLevelRequirement;
                lvl++;
            } else {
                break;
            }
        }
        
        this.level = lvl;
        this.experienceProgress = points / this.getExpToNextLevel(lvl);
    }

    private getExpToNextLevel(level: number): number {
        if (level >= 30) return 112 + (level - 30) * 9;
        if (level >= 15) return 37 + (level - 15) * 5;
        return 7 + level * 2;
    }
}
