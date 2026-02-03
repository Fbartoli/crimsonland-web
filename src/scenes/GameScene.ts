import Phaser from 'phaser';
import {
  PLAYER_MAX_HEALTH,
  PLAYER_MOVE_SPEED,
  ARENA_SIZE,
  PISTOL_FIRE_RATE,
  BULLET_SPEED,
  SPAWN_INTERVAL,
  ZOMBIE_BASE_SPEED,
} from '../constants';

export class GameScene extends Phaser.Scene {
  // Player state
  player!: Phaser.Physics.Arcade.Sprite;
  playerHealth = PLAYER_MAX_HEALTH;

  // Groups
  bullets!: Phaser.Physics.Arcade.Group;
  creatures!: Phaser.Physics.Arcade.Group;

  // Timers
  lastFireTime = 0;
  nextSpawnTime = 0;

  // Input
  cursors!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Create placeholder sprites as colored rectangles
    this.createPlaceholderSprites();
  }

  create(): void {
    // Set world bounds (arena)
    this.physics.world.setBounds(0, 0, ARENA_SIZE, ARENA_SIZE);

    // Create a simple background
    this.add.rectangle(ARENA_SIZE / 2, ARENA_SIZE / 2, ARENA_SIZE, ARENA_SIZE, 0x2d2d44);

    // Create bullet group
    this.bullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 100,
    });

    // Create creatures group
    this.creatures = this.physics.add.group({
      defaultKey: 'zombie',
      maxSize: 200,
    });

    // Create player at center
    this.player = this.physics.add.sprite(ARENA_SIZE / 2, ARENA_SIZE / 2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // Set up camera to follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, ARENA_SIZE, ARENA_SIZE);

    // Set up WASD input
    this.cursors = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Set initial spawn time
    this.nextSpawnTime = this.time.now + SPAWN_INTERVAL;
  }

  update(time: number, _delta: number): void {
    this.handleMovement();
    this.handleAiming();
    this.handleShooting(time);
    this.handleSpawning(time);
    this.moveCreatures();
    this.cleanupBullets();
  }

  private createPlaceholderSprites(): void {
    // Player - green rectangle 32x32
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x44ff44);
    playerGraphics.fillRect(0, 0, 32, 32);
    // Add a direction indicator (triangle pointing right)
    playerGraphics.fillStyle(0x22aa22);
    playerGraphics.fillTriangle(20, 16, 32, 8, 32, 24);
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    // Zombie - red rectangle 32x32
    const zombieGraphics = this.make.graphics({ x: 0, y: 0 });
    zombieGraphics.fillStyle(0xff4444);
    zombieGraphics.fillRect(0, 0, 32, 32);
    zombieGraphics.generateTexture('zombie', 32, 32);
    zombieGraphics.destroy();

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

  private handleMovement(): void {
    // Reset velocity
    this.player.setVelocity(0);

    // WASD movement
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown) {
      vx = -1;
    } else if (this.cursors.right.isDown) {
      vx = 1;
    }

    if (this.cursors.up.isDown) {
      vy = -1;
    } else if (this.cursors.down.isDown) {
      vy = 1;
    }

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const length = Math.sqrt(vx * vx + vy * vy);
      vx /= length;
      vy /= length;
    }

    this.player.setVelocity(vx * PLAYER_MOVE_SPEED, vy * PLAYER_MOVE_SPEED);
  }

  private handleAiming(): void {
    // Get mouse position in world coordinates
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Calculate angle from player to mouse
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      worldPoint.x,
      worldPoint.y
    );

    // Rotate player to face mouse
    this.player.setRotation(angle);
  }

  private handleShooting(time: number): void {
    // Check if left mouse button is down and enough time has passed
    if (this.input.activePointer.isDown && time > this.lastFireTime + PISTOL_FIRE_RATE) {
      this.fireBullet();
      this.lastFireTime = time;
    }
  }

  private fireBullet(): void {
    // Get a bullet from the pool
    const bullet = this.bullets.get(this.player.x, this.player.y) as Phaser.Physics.Arcade.Sprite;

    if (!bullet) return; // Pool exhausted

    bullet.setActive(true);
    bullet.setVisible(true);

    // Get mouse position in world coordinates
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Calculate angle and velocity
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);
    bullet.setRotation(angle);

    // Set velocity toward cursor
    const velocityX = Math.cos(angle) * BULLET_SPEED;
    const velocityY = Math.sin(angle) * BULLET_SPEED;
    bullet.setVelocity(velocityX, velocityY);
  }

  private cleanupBullets(): void {
    // Deactivate bullets that leave the arena
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

  private spawnCreature(): void {
    // Spawn at random edge of arena
    const edge = Phaser.Math.Between(0, 3); // 0=top, 1=right, 2=bottom, 3=left
    let x: number, y: number;

    switch (edge) {
      case 0: // Top
        x = Phaser.Math.Between(0, ARENA_SIZE);
        y = 0;
        break;
      case 1: // Right
        x = ARENA_SIZE;
        y = Phaser.Math.Between(0, ARENA_SIZE);
        break;
      case 2: // Bottom
        x = Phaser.Math.Between(0, ARENA_SIZE);
        y = ARENA_SIZE;
        break;
      default: // Left
        x = 0;
        y = Phaser.Math.Between(0, ARENA_SIZE);
        break;
    }

    const creature = this.creatures.get(x, y) as Phaser.Physics.Arcade.Sprite;

    if (!creature) return; // Pool exhausted

    creature.setActive(true);
    creature.setVisible(true);
    creature.setPosition(x, y);
  }

  private moveCreatures(): void {
    // Move all active creatures toward the player
    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Phaser.Physics.Arcade.Sprite;
      if (!c.active) return;

      // Calculate angle to player
      const angle = Phaser.Math.Angle.Between(c.x, c.y, this.player.x, this.player.y);

      // Set velocity toward player (scale base speed to reasonable pixel value)
      const speed = ZOMBIE_BASE_SPEED * 100; // Convert to ~90 px/sec
      c.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

      // Rotate to face player
      c.setRotation(angle);
    });
  }
}
