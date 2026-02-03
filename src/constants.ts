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

export const CREATURES: CreatureConfig[] = [
  {
    type: CreatureType.ZOMBIE,
    name: 'Zombie',
    health: 40,
    speed: 0.9,
    damage: 20,
    xpValue: 10,
    size: 32,
    color: 0xff4444, // red
  },
  {
    type: CreatureType.FAST,
    name: 'Runner',
    health: 20,
    speed: 1.8,
    damage: 10,
    xpValue: 15,
    size: 24,
    color: 0xffaa44, // orange
  },
  {
    type: CreatureType.TANK,
    name: 'Brute',
    health: 150,
    speed: 0.5,
    damage: 40,
    xpValue: 50,
    size: 48,
    color: 0x8844ff, // purple
  },
];

// Legacy constants for backwards compatibility
export const ZOMBIE_HEALTH = CREATURES[0].health;
export const ZOMBIE_BASE_SPEED = CREATURES[0].speed;
export const ZOMBIE_XP_VALUE = CREATURES[0].xpValue;
export const ZOMBIE_DAMAGE = CREATURES[0].damage;

// Spawning
export const SPAWN_INTERVAL = 2000; // ms
export const ARENA_SIZE = 2000; // px

// Scaling formula from crimsonland.exe:5104
// speedMultiplier = (experience / 4000) * 0.045 + 0.9
export const SPEED_SCALE_DIVISOR = 4000;
export const SPEED_SCALE_FACTOR = 0.045;
export const SPEED_SCALE_BASE = 0.9;
