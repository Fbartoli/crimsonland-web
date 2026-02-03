// All magic numbers from decompilation - traceable and tunable

// Player
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_MOVE_SPEED = 200; // px/sec
export const PLAYER_COLLISION_COOLDOWN = 0.5; // seconds

// Weapons (just pistol for MVP)
export const PISTOL_FIRE_RATE = 200; // ms between shots
export const PISTOL_DAMAGE = 10;
export const BULLET_SPEED = 800;

// Creatures (just zombie for MVP)
export const ZOMBIE_HEALTH = 40;
export const ZOMBIE_BASE_SPEED = 0.9;
export const ZOMBIE_XP_VALUE = 10;

// Spawning
export const SPAWN_INTERVAL = 2000; // ms
export const ARENA_SIZE = 2000; // px

// Scaling formula from crimsonland.exe:5104
// speedMultiplier = (experience / 4000) * 0.045 + 0.9
export const SPEED_SCALE_DIVISOR = 4000;
export const SPEED_SCALE_FACTOR = 0.045;
export const SPEED_SCALE_BASE = 0.9;
