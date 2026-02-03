import Phaser from 'phaser';
import {
  PLAYER_MAX_HEALTH,
  PLAYER_MOVE_SPEED,
  ARENA_SIZE,
  SPAWN_INTERVAL,
  PLAYER_COLLISION_COOLDOWN,
  WEAPONS,
  CREATURES,
  CreatureType,
  SPEED_SCALE_DIVISOR,
  SPEED_SCALE_FACTOR,
  SPEED_SCALE_BASE,
} from '../constants';

export class GameScene extends Phaser.Scene {
  // Player state
  player!: Phaser.Physics.Arcade.Sprite;
  playerHealth = PLAYER_MAX_HEALTH;
  playerXP = 0;
  lastDamageTime = 0;
  isGameOver = false;
  gameStartTime = 0;

  // Weapon state
  currentWeaponIndex = 0;
  ammo = WEAPONS[0].clipSize;
  isReloading = false;
  reloadEndTime = 0;

  // Groups
  bullets!: Phaser.Physics.Arcade.Group;
  creatures!: Phaser.Physics.Arcade.Group;

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

  // Input
  cursors!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  reloadKey!: Phaser.Input.Keyboard.Key;
  weaponKeys!: Phaser.Input.Keyboard.Key[];

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
    this.gameStartTime = this.time.now;

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

    this.weaponKeys = [
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
    ];

    // Set initial spawn time
    this.nextSpawnTime = this.time.now + SPAWN_INTERVAL;

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
  }

  update(time: number, _delta: number): void {
    if (this.isGameOver) {
      if (this.input.activePointer.isDown) {
        this.scene.restart();
      }
      return;
    }

    this.handleMovement();
    this.handleAiming();
    this.handleWeaponSwitch();
    this.handleReload(time);
    this.handleShooting(time);
    this.handleSpawning(time);
    this.moveCreatures();
    this.cleanupBullets();
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

    this.player.setVelocity(vx * PLAYER_MOVE_SPEED, vy * PLAYER_MOVE_SPEED);
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

  private handleWeaponSwitch(): void {
    for (let i = 0; i < this.weaponKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.weaponKeys[i])) {
        if (i !== this.currentWeaponIndex) {
          this.currentWeaponIndex = i;
          this.ammo = WEAPONS[i].clipSize;
          this.isReloading = false;
          this.reloadText.setVisible(false);
        }
      }
    }
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
        this.reloadEndTime = time + weapon.reloadTime;
        this.reloadText.setVisible(true);
      }
    }
  }

  private handleShooting(time: number): void {
    if (this.isReloading) return;
    if (this.ammo <= 0) return;

    const weapon = this.getCurrentWeapon();

    if (this.input.activePointer.isDown && time > this.lastFireTime + weapon.fireRate) {
      this.fireBullets();
      this.lastFireTime = time;
      this.ammo--;

      // Auto-reload when empty
      if (this.ammo === 0) {
        this.isReloading = true;
        this.reloadEndTime = time + weapon.reloadTime;
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

  private handleSpawning(time: number): void {
    if (time > this.nextSpawnTime) {
      this.spawnCreature();
      this.nextSpawnTime = time + SPAWN_INTERVAL;
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

    // Apply damage to creature
    const weapon = this.getCurrentWeapon();
    const currentHealth = (c.getData('health') as number) || 0;
    const newHealth = currentHealth - weapon.damage;
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
      const xpValue = CREATURES[creatureType].xpValue;
      this.playerXP += xpValue;

      c.setActive(false);
      c.setVisible(false);
    }
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
    const damage = CREATURES[creatureType].damage;
    this.playerHealth -= damage;
    this.lastDamageTime = this.time.now;

    this.player.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      this.player.clearTint();
    });
  }

  private updateHUD(): void {
    // Update health bar
    const healthPercent = Math.max(0, this.playerHealth / PLAYER_MAX_HEALTH);
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
    this.weaponText.setText(`[${this.currentWeaponIndex + 1}] ${this.getCurrentWeapon().name}`);
    this.ammoText.setText(this.getAmmoText());

    // Update XP text
    this.xpText.setText(`XP: ${this.playerXP}`);
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
