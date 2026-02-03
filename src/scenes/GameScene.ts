import Phaser from 'phaser';
import {
  PLAYER_MAX_HEALTH,
  PLAYER_MOVE_SPEED,
  ARENA_SIZE,
  SPAWN_INTERVAL_BASE,
  SPAWN_INTERVAL_DIVISOR,
  SPAWN_INTERVAL_MIN,
  PLAYER_COLLISION_COOLDOWN,
  WEAPONS,
  CREATURES,
  CreatureType,
  SPEED_SCALE_DIVISOR,
  SPEED_SCALE_FACTOR,
  SPEED_SCALE_BASE,
  WEAPON_DROP_CHANCE,
  HEALTH_DROP_CHANCE,
  HEALTH_PICKUP_AMOUNT,
  PERKS,
  PERK_CHOICES_COUNT,
  PerkConfig,
  LEVEL_XP_BASE,
  LEVEL_XP_POWER,
} from '../constants';

export class GameScene extends Phaser.Scene {
  // Player state
  player!: Phaser.Physics.Arcade.Sprite;
  playerHealth = PLAYER_MAX_HEALTH;
  playerXP = 0;
  lastDamageTime = 0;
  isGameOver = false;
  gameStartTime = 0;

  // Level and perk system
  playerLevel = 1;
  perkPendingCount = 0;
  perkCounts: Map<string, number> = new Map();
  isPerkSelectionActive = false;

  // Weapon state
  currentWeaponIndex = 0;
  ammo = WEAPONS[0].clipSize;
  isReloading = false;
  reloadEndTime = 0;
  lastWeaponPickupTime = 0;

  // Groups
  bullets!: Phaser.Physics.Arcade.Group;
  creatures!: Phaser.Physics.Arcade.Group;
  weaponPickups!: Phaser.Physics.Arcade.Group;
  healthPickups!: Phaser.Physics.Arcade.Group;

  // Timers
  lastFireTime = 0;
  nextSpawnTime = 0;

  // UI
  healthBarBg!: Phaser.GameObjects.Rectangle;
  healthBarFill!: Phaser.GameObjects.Rectangle;
  ammoText!: Phaser.GameObjects.Text;
  weaponText!: Phaser.GameObjects.Text;
  reloadText!: Phaser.GameObjects.Text;
  gameOverText!: Phaser.GameObjects.Text;
  xpText!: Phaser.GameObjects.Text;
  levelText!: Phaser.GameObjects.Text;

  // Perk selection UI
  perkOverlay!: Phaser.GameObjects.Rectangle;
  perkContainer!: Phaser.GameObjects.Container;
  perkTitleText!: Phaser.GameObjects.Text;

  // Input
  cursors!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  reloadKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.createPlaceholderSprites();
  }

  create(): void {
    // Reset game state
    this.playerHealth = PLAYER_MAX_HEALTH;
    this.playerXP = 0;
    this.lastDamageTime = 0;
    this.isGameOver = false;
    this.lastFireTime = 0;
    this.currentWeaponIndex = 0;
    this.ammo = WEAPONS[0].clipSize;
    this.isReloading = false;
    this.lastWeaponPickupTime = 0;
    this.gameStartTime = this.time.now;

    // Reset perk state
    this.playerLevel = 1;
    this.perkPendingCount = 0;
    this.perkCounts.clear();
    this.isPerkSelectionActive = false;

    // Set world bounds (arena)
    this.physics.world.setBounds(0, 0, ARENA_SIZE, ARENA_SIZE);

    // Create a simple background
    this.add.rectangle(ARENA_SIZE / 2, ARENA_SIZE / 2, ARENA_SIZE, ARENA_SIZE, 0x2d2d44);

    // Create bullet group (increased size for shotgun)
    this.bullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 200,
    });

    // Create creatures group (no default key - we handle textures per type)
    this.creatures = this.physics.add.group({
      maxSize: 200,
    });

    // Create weapon pickups group
    this.weaponPickups = this.physics.add.group({
      maxSize: 50,
    });

    // Create health pickups group
    this.healthPickups = this.physics.add.group({
      maxSize: 30,
    });

    // Create player at center
    this.player = this.physics.add.sprite(ARENA_SIZE / 2, ARENA_SIZE / 2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // Set up collisions
    this.physics.add.overlap(
      this.bullets,
      this.creatures,
      this.onBulletHitCreature,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.creatures,
      this.onCreatureHitPlayer,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.weaponPickups,
      this.onWeaponPickup,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.healthPickups,
      this.onHealthPickup,
      undefined,
      this
    );

    // Set up camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, ARENA_SIZE, ARENA_SIZE);

    // Set up input
    this.cursors = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.reloadKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // Set initial spawn time (uses base interval since game just started)
    this.nextSpawnTime = this.time.now + SPAWN_INTERVAL_BASE;

    // Create HUD
    this.createHUD();
  }

  private createHUD(): void {
    // Health bar background
    this.healthBarBg = this.add.rectangle(16, 16, 200, 20, 0x333333);
    this.healthBarBg.setOrigin(0, 0);
    this.healthBarBg.setScrollFactor(0);
    this.healthBarBg.setDepth(100);

    // Health bar fill
    this.healthBarFill = this.add.rectangle(16, 16, 200, 20, 0x44ff44);
    this.healthBarFill.setOrigin(0, 0);
    this.healthBarFill.setScrollFactor(0);
    this.healthBarFill.setDepth(101);

    // Weapon name
    this.weaponText = this.add.text(16, 44, this.getCurrentWeapon().name, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
    });
    this.weaponText.setScrollFactor(0);
    this.weaponText.setDepth(100);

    // Ammo counter
    this.ammoText = this.add.text(16, 68, this.getAmmoText(), {
      fontSize: '20px',
      color: '#ffff44',
      fontFamily: 'Arial',
    });
    this.ammoText.setScrollFactor(0);
    this.ammoText.setDepth(100);

    // Reload indicator (hidden initially)
    this.reloadText = this.add.text(400, 400, 'RELOADING...', {
      fontSize: '24px',
      color: '#ff8844',
      fontFamily: 'Arial',
    });
    this.reloadText.setOrigin(0.5);
    this.reloadText.setScrollFactor(0);
    this.reloadText.setDepth(100);
    this.reloadText.setVisible(false);

    // Game over text (hidden initially)
    this.gameOverText = this.add.text(400, 300, 'GAME OVER\n\nClick to restart', {
      fontSize: '48px',
      color: '#ff4444',
      fontFamily: 'Arial',
      align: 'center',
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setScrollFactor(0);
    this.gameOverText.setDepth(100);
    this.gameOverText.setVisible(false);

    // XP counter (top right)
    this.xpText = this.add.text(784, 16, 'XP: 0', {
      fontSize: '20px',
      color: '#44ffff',
      fontFamily: 'Arial',
    });
    this.xpText.setOrigin(1, 0);
    this.xpText.setScrollFactor(0);
    this.xpText.setDepth(100);

    // Level counter (below XP)
    this.levelText = this.add.text(784, 44, 'Level: 1', {
      fontSize: '20px',
      color: '#ffaa44',
      fontFamily: 'Arial',
    });
    this.levelText.setOrigin(1, 0);
    this.levelText.setScrollFactor(0);
    this.levelText.setDepth(100);

    // Create perk selection UI (hidden initially)
    this.createPerkUI();
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) {
      if (this.input.activePointer.isDown) {
        this.scene.restart();
      }
      return;
    }

    // Skip game updates if perk selection is active
    if (this.isPerkSelectionActive) {
      return;
    }

    this.handleMovement();
    this.handleAiming();
    this.handleReload(time);
    this.handleShooting(time);
    this.handleSpawning(time);
    this.moveCreatures();
    this.cleanupBullets();
    this.applyPerkEffects(delta);
    this.checkLevelUp();
    this.checkDeath();
    this.updateHUD();
  }

  private createPlaceholderSprites(): void {
    // Player - green rectangle 32x32
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x44ff44);
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.fillStyle(0x22aa22);
    playerGraphics.fillTriangle(20, 16, 32, 8, 32, 24);
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    // Create creature sprites for each type
    for (const creature of CREATURES) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(creature.color);
      g.fillRect(0, 0, creature.size, creature.size);
      g.generateTexture(`creature_${creature.type}`, creature.size, creature.size);
      g.destroy();
    }

    // Bullet - yellow rectangle 8x4
    const bulletGraphics = this.make.graphics({ x: 0, y: 0 });
    bulletGraphics.fillStyle(0xffff44);
    bulletGraphics.fillRect(0, 0, 8, 4);
    bulletGraphics.generateTexture('bullet', 8, 4);
    bulletGraphics.destroy();

    // Health pickup - pink circle 16x16
    const healthGraphics = this.make.graphics({ x: 0, y: 0 });
    healthGraphics.fillStyle(0xff88cc);
    healthGraphics.fillCircle(8, 8, 8);
    healthGraphics.generateTexture('health', 16, 16);
    healthGraphics.destroy();

    // Create weapon pickup sprites for each weapon type
    for (let i = 0; i < WEAPONS.length; i++) {
      const weapon = WEAPONS[i];
      const g = this.make.graphics({ x: 0, y: 0 });
      // Draw a rectangle with the weapon's color
      g.fillStyle(weapon.color);
      g.fillRect(0, 0, 24, 16);
      // Add a small indicator triangle to show it's a pickup
      g.fillStyle(0xffffff);
      g.fillTriangle(18, 8, 24, 4, 24, 12);
      g.generateTexture(`weapon_${i}`, 24, 16);
      g.destroy();
    }
  }

  private getCurrentWeapon() {
    return WEAPONS[this.currentWeaponIndex];
  }

  private getAmmoText(): string {
    const weapon = this.getCurrentWeapon();
    return `${this.ammo} / ${weapon.clipSize}`;
  }

  private handleMovement(): void {
    this.player.setVelocity(0);

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown) vx = -1;
    else if (this.cursors.right.isDown) vx = 1;

    if (this.cursors.up.isDown) vy = -1;
    else if (this.cursors.down.isDown) vy = 1;

    if (vx !== 0 && vy !== 0) {
      const length = Math.sqrt(vx * vx + vy * vy);
      vx /= length;
      vy /= length;
    }

    // Apply Long Distance Runner speed bonus (+15% per stack)
    const speedStacks = this.perkCounts.get('long_distance_runner') || 0;
    const speedBonus = speedStacks * 0.15;
    const speed = PLAYER_MOVE_SPEED * (1 + speedBonus);

    this.player.setVelocity(vx * speed, vy * speed);
  }

  private handleAiming(): void {
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      worldPoint.x,
      worldPoint.y
    );
    this.player.setRotation(angle);
  }

  private getEffectiveReloadTime(): number {
    const weapon = this.getCurrentWeapon();
    // Fast Loader: 20% faster reload per stack
    const fastLoaderStacks = this.perkCounts.get('fast_loader') || 0;
    const reloadBonus = Math.min(fastLoaderStacks * 0.2, 0.8); // Cap at 80% reduction
    return weapon.reloadTime * (1 - reloadBonus);
  }

  private getEffectiveFireRate(): number {
    const weapon = this.getCurrentWeapon();
    // Fastshot: 15% faster fire rate per stack
    const fastshotStacks = this.perkCounts.get('fastshot') || 0;
    const fireRateBonus = Math.min(fastshotStacks * 0.15, 0.6); // Cap at 60% reduction
    return weapon.fireRate * (1 - fireRateBonus);
  }

  private getEffectiveDamage(): number {
    const weapon = this.getCurrentWeapon();
    // Sharpshooter: 20% more damage per stack
    const sharpshooterStacks = this.perkCounts.get('sharpshooter') || 0;
    const damageBonus = sharpshooterStacks * 0.2;
    return weapon.damage * (1 + damageBonus);
  }

  private getEffectiveMaxHealth(): number {
    // Tough Guy: +20 max health per stack
    const healthBonusStacks = this.perkCounts.get('health_bonus') || 0;
    return PLAYER_MAX_HEALTH + (healthBonusStacks * 20);
  }

  private handleReload(time: number): void {
    const weapon = this.getCurrentWeapon();

    // Check if reload is complete
    if (this.isReloading && time >= this.reloadEndTime) {
      this.isReloading = false;
      this.ammo = weapon.clipSize;
      this.reloadText.setVisible(false);
    }

    // Start reload on R key or empty clip
    if (!this.isReloading && this.ammo < weapon.clipSize) {
      if (Phaser.Input.Keyboard.JustDown(this.reloadKey) || this.ammo === 0) {
        this.isReloading = true;
        this.reloadEndTime = time + this.getEffectiveReloadTime();
        this.reloadText.setVisible(true);
      }
    }
  }

  private handleShooting(time: number): void {
    if (this.isReloading) return;
    if (this.ammo <= 0) return;

    const effectiveFireRate = this.getEffectiveFireRate();

    if (this.input.activePointer.isDown && time > this.lastFireTime + effectiveFireRate) {
      this.fireBullets();
      this.lastFireTime = time;
      this.ammo--;

      // Auto-reload when empty
      if (this.ammo === 0) {
        this.isReloading = true;
        this.reloadEndTime = time + this.getEffectiveReloadTime();
        this.reloadText.setVisible(true);
      }
    }
  }

  private fireBullets(): void {
    const weapon = this.getCurrentWeapon();
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const baseAngle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      worldPoint.x,
      worldPoint.y
    );

    for (let i = 0; i < weapon.pellets; i++) {
      const bullet = this.bullets.get(this.player.x, this.player.y) as Phaser.Physics.Arcade.Sprite;
      if (!bullet) continue;

      bullet.setActive(true);
      bullet.setVisible(true);

      // Calculate spread angle
      let angle = baseAngle;
      if (weapon.pellets > 1) {
        // Spread evenly across the spread arc
        const spreadRange = weapon.spread;
        const offset = (i / (weapon.pellets - 1) - 0.5) * spreadRange;
        angle += offset;
      } else if (weapon.spread > 0) {
        // Single bullet with random spread (SMG inaccuracy)
        angle += (Math.random() - 0.5) * weapon.spread;
      }

      bullet.setRotation(angle);
      bullet.setVelocity(
        Math.cos(angle) * weapon.bulletSpeed,
        Math.sin(angle) * weapon.bulletSpeed
      );
    }
  }

  private cleanupBullets(): void {
    this.bullets.getChildren().forEach((bullet) => {
      const b = bullet as Phaser.Physics.Arcade.Sprite;
      if (b.active && (b.x < 0 || b.x > ARENA_SIZE || b.y < 0 || b.y > ARENA_SIZE)) {
        b.setActive(false);
        b.setVisible(false);
      }
    });
  }

  private getSpawnInterval(): number {
    // Original formula from crimsonland.exe:37535-37538
    // spawn_interval = 3500 - elapsed_ms / 800, minimum 100ms
    const elapsed = this.time.now - this.gameStartTime;
    const interval = SPAWN_INTERVAL_BASE - Math.floor(elapsed / SPAWN_INTERVAL_DIVISOR);
    return Math.max(interval, SPAWN_INTERVAL_MIN);
  }

  private handleSpawning(time: number): void {
    if (time > this.nextSpawnTime) {
      this.spawnCreature();
      this.nextSpawnTime = time + this.getSpawnInterval();
    }
  }

  private getCreatureTypeToSpawn(): CreatureType {
    const elapsed = this.time.now - this.gameStartTime;
    const elapsedSeconds = elapsed / 1000;

    // Build weighted pool based on time
    const pool: CreatureType[] = [];

    // Zombies always spawn
    pool.push(CreatureType.ZOMBIE, CreatureType.ZOMBIE, CreatureType.ZOMBIE);

    // Fast creatures after 30 seconds
    if (elapsedSeconds >= 30) {
      pool.push(CreatureType.FAST, CreatureType.FAST);
    }

    // Tanks after 120 seconds
    if (elapsedSeconds >= 120) {
      pool.push(CreatureType.TANK);
    }

    return pool[Phaser.Math.Between(0, pool.length - 1)];
  }

  private spawnCreature(): void {
    const edge = Phaser.Math.Between(0, 3);
    let x: number, y: number;

    switch (edge) {
      case 0: x = Phaser.Math.Between(0, ARENA_SIZE); y = 0; break;
      case 1: x = ARENA_SIZE; y = Phaser.Math.Between(0, ARENA_SIZE); break;
      case 2: x = Phaser.Math.Between(0, ARENA_SIZE); y = ARENA_SIZE; break;
      default: x = 0; y = Phaser.Math.Between(0, ARENA_SIZE); break;
    }

    const creatureType = this.getCreatureTypeToSpawn();
    const config = CREATURES[creatureType];

    // Create sprite with correct texture
    const creature = this.creatures.create(x, y, `creature_${creatureType}`) as Phaser.Physics.Arcade.Sprite;
    if (!creature) return;

    creature.setActive(true);
    creature.setVisible(true);
    creature.setPosition(x, y);
    creature.setTint(config.color);

    // Store creature data
    creature.setData('creatureType', creatureType);
    creature.setData('health', config.health);
  }

  private getSpeedMultiplier(): number {
    // Formula from crimsonland.exe:5104
    return (this.playerXP / SPEED_SCALE_DIVISOR) * SPEED_SCALE_FACTOR + SPEED_SCALE_BASE;
  }

  private moveCreatures(): void {
    const speedMultiplier = this.getSpeedMultiplier();

    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Phaser.Physics.Arcade.Sprite;
      if (!c.active) return;

      const creatureType = c.getData('creatureType') as CreatureType;
      const config = CREATURES[creatureType];

      const angle = Phaser.Math.Angle.Between(c.x, c.y, this.player.x, this.player.y);
      const baseSpeed = config.speed * 100;
      const speed = baseSpeed * speedMultiplier;
      c.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      c.setRotation(angle);
    });
  }

  private onBulletHitCreature(
    bullet: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    creature: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const b = bullet as Phaser.Physics.Arcade.Sprite;
    const c = creature as Phaser.Physics.Arcade.Sprite;

    if (!c.active) return;

    // Deactivate bullet
    b.setActive(false);
    b.setVisible(false);

    // Apply damage to creature (with Sharpshooter bonus)
    const effectiveDamage = this.getEffectiveDamage();
    const currentHealth = (c.getData('health') as number) || 0;
    const newHealth = currentHealth - effectiveDamage;
    c.setData('health', newHealth);

    // Flash creature white on hit
    c.setTint(0xffffff);
    this.time.delayedCall(50, () => {
      if (c.active) {
        const creatureType = c.getData('creatureType') as CreatureType;
        c.setTint(CREATURES[creatureType].color);
      }
    });

    // Kill creature if health depleted
    if (newHealth <= 0) {
      const creatureType = c.getData('creatureType') as CreatureType;
      let xpValue = CREATURES[creatureType].xpValue;

      // Lean Mean XP Machine: +15 XP per kill per stack
      const xpBonusStacks = this.perkCounts.get('lean_mean_xp_machine') || 0;
      xpValue += xpBonusStacks * 15;

      this.playerXP += xpValue;

      // Try to drop loot
      this.tryDropWeapon(c.x, c.y);
      this.tryDropHealth(c.x, c.y);

      c.setActive(false);
      c.setVisible(false);
    }
  }

  private tryDropWeapon(x: number, y: number): void {
    // Check if we should drop a weapon
    if (Math.random() > WEAPON_DROP_CHANCE) return;

    // Build weighted pool of droppable weapons
    const pool: number[] = [];
    for (let i = 0; i < WEAPONS.length; i++) {
      const weight = WEAPONS[i].dropWeight;
      for (let j = 0; j < weight; j++) {
        pool.push(i);
      }
    }

    // No droppable weapons configured
    if (pool.length === 0) return;

    // Pick random weapon from pool
    const weaponIndex = pool[Phaser.Math.Between(0, pool.length - 1)];
    const weapon = WEAPONS[weaponIndex];

    // Spawn with full ammo
    this.spawnWeaponPickup(x, y, weaponIndex, weapon.clipSize);
  }

  private tryDropHealth(x: number, y: number): void {
    if (Math.random() > HEALTH_DROP_CHANCE) return;

    const pickup = this.healthPickups.create(x, y, 'health') as Phaser.Physics.Arcade.Sprite;
    if (!pickup) return;

    pickup.setActive(true);
    pickup.setVisible(true);
    pickup.setDepth(5);

    // Slight random offset
    pickup.setPosition(
      x + Phaser.Math.Between(-10, 10),
      y + Phaser.Math.Between(-10, 10)
    );
  }

  private onHealthPickup(
    _player: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    pickup: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const p = pickup as Phaser.Physics.Arcade.Sprite;
    if (!p.active) return;

    // Only pick up if not at full health
    const maxHealth = this.getEffectiveMaxHealth();
    if (this.playerHealth >= maxHealth) return;

    // Heal player (cap at max)
    this.playerHealth = Math.min(this.playerHealth + HEALTH_PICKUP_AMOUNT, maxHealth);

    // Remove pickup
    p.setActive(false);
    p.setVisible(false);

    // Visual feedback - brief green flash
    this.player.setTint(0x44ff44);
    this.time.delayedCall(100, () => {
      this.player.clearTint();
    });
  }

  private onCreatureHitPlayer(
    _player: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    creature: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const c = creature as Phaser.Physics.Arcade.Sprite;

    const cooldownMs = PLAYER_COLLISION_COOLDOWN * 1000;
    if (this.time.now < this.lastDamageTime + cooldownMs) return;
    if (!c.active) return;

    const creatureType = c.getData('creatureType') as CreatureType;
    const baseDamage = CREATURES[creatureType].damage;

    // Apply Thick Skinned damage reduction (10% per stack, max 90%)
    const thickSkinnedStacks = this.perkCounts.get('thick_skinned') || 0;
    const damageReduction = Math.min(thickSkinnedStacks * 0.1, 0.9);
    const finalDamage = baseDamage * (1 - damageReduction);

    this.playerHealth -= finalDamage;
    this.lastDamageTime = this.time.now;

    this.player.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      this.player.clearTint();
    });
  }

  private onWeaponPickup(
    _player: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    pickup: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): void {
    const p = pickup as Phaser.Physics.Arcade.Sprite;
    if (!p.active) return;

    // Prevent rapid swap loops - 500ms cooldown
    if (this.time.now < this.lastWeaponPickupTime + 500) return;

    const pickupWeaponIndex = p.getData('weaponIndex') as number;
    const pickupAmmo = p.getData('ammo') as number;

    // Remove the pickup first (before spawning new one)
    p.setActive(false);
    p.setVisible(false);

    // Drop current weapon at player position
    this.spawnWeaponPickup(this.player.x, this.player.y, this.currentWeaponIndex, this.ammo);

    // Pick up new weapon
    this.currentWeaponIndex = pickupWeaponIndex;
    this.ammo = pickupAmmo;
    this.isReloading = false;
    this.reloadText.setVisible(false);
    this.lastWeaponPickupTime = this.time.now;
  }

  private spawnWeaponPickup(x: number, y: number, weaponIndex: number, ammo: number): void {
    const pickup = this.weaponPickups.create(x, y, `weapon_${weaponIndex}`) as Phaser.Physics.Arcade.Sprite;
    if (!pickup) return;

    pickup.setActive(true);
    pickup.setVisible(true);
    pickup.setData('weaponIndex', weaponIndex);
    pickup.setData('ammo', ammo);
    pickup.setDepth(5);

    // Add slight random offset so dropped weapons don't stack exactly
    pickup.setPosition(
      x + Phaser.Math.Between(-10, 10),
      y + Phaser.Math.Between(-10, 10)
    );
  }

  private updateHUD(): void {
    // Update health bar (use effective max health for Tough Guy perk)
    const maxHealth = this.getEffectiveMaxHealth();
    const healthPercent = Math.max(0, this.playerHealth / maxHealth);
    this.healthBarFill.setScale(healthPercent, 1);

    // Change color based on health
    if (healthPercent > 0.5) {
      this.healthBarFill.setFillStyle(0x44ff44);
    } else if (healthPercent > 0.25) {
      this.healthBarFill.setFillStyle(0xffff44);
    } else {
      this.healthBarFill.setFillStyle(0xff4444);
    }

    // Update weapon and ammo text
    this.weaponText.setText(this.getCurrentWeapon().name);
    this.ammoText.setText(this.getAmmoText());

    // Update XP text
    this.xpText.setText(`XP: ${this.playerXP}`);

    // Update level text
    this.levelText.setText(`Level: ${this.playerLevel}`);
  }

  private createPerkUI(): void {
    // Dark overlay (covers full screen)
    this.perkOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);
    this.perkOverlay.setScrollFactor(0);
    this.perkOverlay.setDepth(200);
    this.perkOverlay.setVisible(false);

    // Title text
    this.perkTitleText = this.add.text(400, 60, 'LEVEL UP! Choose a Perk', {
      fontSize: '32px',
      color: '#ffaa44',
      fontFamily: 'Arial',
    });
    this.perkTitleText.setOrigin(0.5);
    this.perkTitleText.setScrollFactor(0);
    this.perkTitleText.setDepth(201);
    this.perkTitleText.setVisible(false);

    // Container for perk buttons
    this.perkContainer = this.add.container(0, 0);
    this.perkContainer.setScrollFactor(0);
    this.perkContainer.setDepth(201);
    this.perkContainer.setVisible(false);
  }

  private getXPThreshold(level: number): number {
    // Original formula from crimsonland.exe:6917-6919
    // threshold = 1000 * (1 - pow(0.7, level))
    // Level 2 at 300 XP, Level 3 at 510 XP, Level 4 at 657 XP, etc.
    // Gaps DECREASE over time (snowball effect - more perks = faster leveling)
    return Math.floor(LEVEL_XP_BASE * (1 - Math.pow(LEVEL_XP_POWER, level)));
  }

  private checkLevelUp(): void {
    // Check if player has enough XP to level up
    while (this.playerXP >= this.getXPThreshold(this.playerLevel)) {
      this.playerLevel++;
      this.perkPendingCount++;
    }

    // Show perk selection if we have pending perks and not already showing
    if (this.perkPendingCount > 0 && !this.isPerkSelectionActive) {
      this.showPerkSelection();
    }
  }

  private showPerkSelection(): void {
    this.isPerkSelectionActive = true;
    this.physics.pause();

    // Show overlay and title
    this.perkOverlay.setVisible(true);
    this.perkTitleText.setVisible(true);
    this.perkTitleText.setText(`LEVEL UP! Choose a Perk (${this.perkPendingCount} remaining)`);
    this.perkContainer.setVisible(true);

    // Clear old buttons
    this.perkContainer.removeAll(true);

    // Get random perks to display
    const perksToShow = this.getRandomPerks(Math.min(PERK_CHOICES_COUNT, PERKS.length));

    // Create buttons for each perk
    const buttonHeight = 70;
    const startY = 120;
    const buttonWidth = 350;

    perksToShow.forEach((perk, index) => {
      const y = startY + index * buttonHeight;
      const currentStacks = this.perkCounts.get(perk.id) || 0;

      // Button background - set high depth and scrollFactor for each element
      const bg = this.add.rectangle(400, y, buttonWidth, buttonHeight - 10, 0x444466);
      bg.setScrollFactor(0);
      bg.setDepth(202);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x6666aa));
      bg.on('pointerout', () => bg.setFillStyle(0x444466));
      bg.on('pointerdown', () => this.selectPerk(perk));

      // Perk name with stack count
      const stackText = currentStacks > 0 ? ` (x${currentStacks})` : '';
      const nameText = this.add.text(400, y - 15, perk.name + stackText, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
      });
      nameText.setOrigin(0.5);
      nameText.setScrollFactor(0);
      nameText.setDepth(203);

      // Perk description
      const descText = this.add.text(400, y + 10, perk.description, {
        fontSize: '14px',
        color: '#aaaaaa',
        fontFamily: 'Arial',
      });
      descText.setOrigin(0.5);
      descText.setScrollFactor(0);
      descText.setDepth(203);

      this.perkContainer.add([bg, nameText, descText]);
    });
  }

  private getRandomPerks(count: number): PerkConfig[] {
    // Shuffle and return up to count perks
    const shuffled = [...PERKS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private selectPerk(perk: PerkConfig): void {
    // Increment perk count
    const current = this.perkCounts.get(perk.id) || 0;
    this.perkCounts.set(perk.id, current + 1);

    this.perkPendingCount--;

    if (this.perkPendingCount <= 0) {
      this.hidePerkSelection();
    } else {
      // Refresh perk choices for next selection
      this.showPerkSelection();
    }
  }

  private hidePerkSelection(): void {
    this.isPerkSelectionActive = false;
    this.perkOverlay.setVisible(false);
    this.perkTitleText.setVisible(false);
    this.perkContainer.setVisible(false);
    this.perkContainer.removeAll(true);
    this.physics.resume();
  }

  private applyPerkEffects(delta: number): void {
    const maxHealth = this.getEffectiveMaxHealth();

    // Regeneration: +1 HP/sec per stack when below max health
    // From crimsonland.exe:4710 - condition: health < 100 && health > 0
    const regenStacks = this.perkCounts.get('regeneration') || 0;
    if (regenStacks > 0 && this.playerHealth < maxHealth && this.playerHealth > 0) {
      const regenRate = regenStacks * 1; // 1 HP per second per stack
      this.playerHealth = Math.min(
        maxHealth,
        this.playerHealth + regenRate * (delta / 1000)
      );
    }
  }

  private checkDeath(): void {
    if (this.playerHealth <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      this.player.setVelocity(0);
      this.player.setVisible(false);
      this.gameOverText.setVisible(true);
      this.reloadText.setVisible(false);

      this.creatures.getChildren().forEach((creature) => {
        const c = creature as Phaser.Physics.Arcade.Sprite;
        c.setVelocity(0, 0);
      });
    }
  }
}
