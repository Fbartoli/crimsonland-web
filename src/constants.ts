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
  },
  {
    name: 'SMG',
    fireRate: 80,
    damage: 8,
    clipSize: 30,
    reloadTime: 1200,
    bulletSpeed: 900,
    pellets: 1,
    spread: 0.1, // slight inaccuracy
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
  },
];

// Legacy constants for backwards compatibility
export const PISTOL_FIRE_RATE = WEAPONS[0].fireRate;
export const PISTOL_DAMAGE = WEAPONS[0].damage;
export const BULLET_SPEED = WEAPONS[0].bulletSpeed;

// Creatures (just zombie for MVP)
export const ZOMBIE_HEALTH = 40;
export const ZOMBIE_BASE_SPEED = 0.9;
export const ZOMBIE_XP_VALUE = 10;
export const ZOMBIE_DAMAGE = 20;

// Spawning
export const SPAWN_INTERVAL = 2000; // ms
export const ARENA_SIZE = 2000; // px

// Scaling formula from crimsonland.exe:5104
// speedMultiplier = (experience / 4000) * 0.045 + 0.9
export const SPEED_SCALE_DIVISOR = 4000;
export const SPEED_SCALE_FACTOR = 0.045;
export const SPEED_SCALE_BASE = 0.9;
