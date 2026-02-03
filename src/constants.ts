// All magic numbers from decompilation - traceable and tunable

// Player
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_MOVE_SPEED = 200; // px/sec
export const PLAYER_COLLISION_COOLDOWN = 0.5; // seconds

// Weapons
export interface WeaponConfig {
  name: string;
  fireRate: number; // ms between shots
  damage: number;
  clipSize: number;
  reloadTime: number; // ms
  bulletSpeed: number;
  pellets: number; // 1 for single shot, >1 for spread
  spread: number; // radians, 0 for single shot
  color: number; // hex color for pickup sprite
  dropWeight: number; // relative drop chance (higher = more common)
}

export const WEAPONS: WeaponConfig[] = [
  {
    name: 'Pistol',
    fireRate: 200,
    damage: 10,
    clipSize: 12,
    reloadTime: 1000,
    bulletSpeed: 800,
    pellets: 1,
    spread: 0,
    color: 0x888888, // gray
    dropWeight: 0, // pistol doesn't drop (player starts with it)
  },
  {
    name: 'SMG',
    fireRate: 80,
    damage: 8,
    clipSize: 30,
    reloadTime: 1200,
    bulletSpeed: 900,
    pellets: 1,
    spread: 0.1,
    color: 0x44aaff, // blue
    dropWeight: 3, // common
  },
  {
    name: 'Shotgun',
    fireRate: 600,
    damage: 15,
    clipSize: 8,
    reloadTime: 1500,
    bulletSpeed: 700,
    pellets: 8,
    spread: 0.3,
    color: 0xff8844, // orange
    dropWeight: 2, // less common
  },
];

// Weapon drop chance when creature dies
export const WEAPON_DROP_CHANCE = 0.15; // 15% chance to drop a weapon

// Health pickups
export const HEALTH_DROP_CHANCE = 0.10; // 10% chance to drop health
export const HEALTH_PICKUP_AMOUNT = 25; // HP restored on pickup

// Legacy constants for backwards compatibility
export const PISTOL_FIRE_RATE = WEAPONS[0].fireRate;
export const PISTOL_DAMAGE = WEAPONS[0].damage;
export const BULLET_SPEED = WEAPONS[0].bulletSpeed;

// Creature types
export enum CreatureType {
  ZOMBIE = 0,
  FAST = 1,
  TANK = 2,
}

export interface CreatureConfig {
  type: CreatureType;
  name: string;
  health: number;
  speed: number; // multiplier
  damage: number;
  xpValue: number;
  size: number; // sprite size in px
  color: number; // hex color for placeholder
}

// XP formula from crimsonland.exe:5169-5172, 5233:
// reward_value = (health * 0.4 + contact_damage * 0.8 + move_speed * 5.0 + random(10-19)) * 0.8
// Special creatures: 320-900 XP (lines 5179, 5189, 5199, 5213, 5225)
export const CREATURES: CreatureConfig[] = [
  {
    type: CreatureType.ZOMBIE,
    name: 'Zombie',
    health: 40,
    speed: 0.9,
    damage: 20,
    xpValue: 50, // base creature ~34-50 XP in original
    size: 32,
    color: 0xff4444, // red
  },
  {
    type: CreatureType.FAST,
    name: 'Runner',
    health: 20,
    speed: 1.8,
    damage: 10,
    xpValue: 80, // faster = more XP
    size: 24,
    color: 0xffaa44, // orange
  },
  {
    type: CreatureType.TANK,
    name: 'Brute',
    health: 150,
    speed: 0.5,
    damage: 40,
    xpValue: 300, // special creatures give 320-600 XP in original
    size: 48,
    color: 0x8844ff, // purple
  },
];

// Legacy constants for backwards compatibility
export const ZOMBIE_HEALTH = CREATURES[0].health;
export const ZOMBIE_BASE_SPEED = CREATURES[0].speed;
export const ZOMBIE_XP_VALUE = CREATURES[0].xpValue;
export const ZOMBIE_DAMAGE = CREATURES[0].damage;

// Spawning - from crimsonland.exe:4960 and 37535-37538
// Original uses 250ms base cooldown with acceleration
// Formula: base - elapsed_ms / divisor, minimum 100ms
export const SPAWN_INTERVAL_BASE = 1000; // ms - starting spawn interval (faster than before)
export const SPAWN_INTERVAL_DIVISOR = 200; // elapsed_ms / this = reduction (faster acceleration)
export const SPAWN_INTERVAL_MIN = 250; // ms - from crimsonland.exe:4960 (0xfa = 250)
export const ARENA_SIZE = 2000; // px

// Scaling formula from crimsonland.exe:5104
// speedMultiplier = (experience / 4000) * 0.045 + 0.9
export const SPEED_SCALE_DIVISOR = 4000;
export const SPEED_SCALE_FACTOR = 0.045;
export const SPEED_SCALE_BASE = 0.9;

// Perks (from crimsonland.exe decompilation)
// 7 perk choices on level up (crimsonland.exe:3579)
// Perks are stackable via perk_counts[] array (crimsonland.exe:3995)
export const PERK_CHOICES_COUNT = 7;

// Level-up thresholds - cumulative XP needed to reach each level
// Using growing formula: threshold = base * (level - 1) * level / 2
// Level 2: 500, Level 3: 1500, Level 4: 3000, Level 5: 5000, etc.
// Each level requires MORE XP than the previous
export const LEVEL_XP_BASE = 500;

export type PerkEffect =
  | 'regeneration'
  | 'damage_reduction'
  | 'speed_bonus'
  | 'fire_rate'
  | 'damage_bonus'
  | 'reload_speed'
  | 'xp_bonus'
  | 'health_bonus';

export interface PerkConfig {
  id: string;
  name: string;
  description: string;
  stackable: boolean;
  maxStacks?: number; // undefined = unlimited
  effect: PerkEffect;
  value: number; // effect magnitude per stack
}

export const PERKS: PerkConfig[] = [
  // Defensive perks
  {
    id: 'regeneration',
    name: 'Regeneration',
    description: '+1 HP/sec when below max health',
    stackable: true,
    effect: 'regeneration',
    value: 1,
  },
  {
    id: 'thick_skinned',
    name: 'Thick Skinned',
    description: '10% damage reduction per stack',
    stackable: true,
    effect: 'damage_reduction',
    value: 0.1,
  },
  {
    id: 'health_bonus',
    name: 'Tough Guy',
    description: '+20 max health per stack',
    stackable: true,
    effect: 'health_bonus',
    value: 20,
  },
  // Movement perks
  {
    id: 'long_distance_runner',
    name: 'Long Distance Runner',
    description: '+15% movement speed per stack',
    stackable: true,
    effect: 'speed_bonus',
    value: 0.15,
  },
  // Offensive perks
  {
    id: 'fastshot',
    name: 'Fastshot',
    description: '+15% fire rate per stack',
    stackable: true,
    effect: 'fire_rate',
    value: 0.15,
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: '+20% damage per stack',
    stackable: true,
    effect: 'damage_bonus',
    value: 0.2,
  },
  // Utility perks
  {
    id: 'fast_loader',
    name: 'Fast Loader',
    description: '20% faster reload per stack',
    stackable: true,
    effect: 'reload_speed',
    value: 0.2,
  },
  {
    id: 'lean_mean_xp_machine',
    name: 'Lean Mean XP Machine',
    description: '+15 XP per kill per stack',
    stackable: true,
    effect: 'xp_bonus',
    value: 15,
  },
];
