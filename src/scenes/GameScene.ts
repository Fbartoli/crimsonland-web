import Phaser from 'phaser';
import { PLAYER_MAX_HEALTH, PLAYER_MOVE_SPEED, ARENA_SIZE } from '../constants';

export class GameScene extends Phaser.Scene {
  // Player state
  player!: Phaser.Physics.Arcade.Sprite;
  playerHealth = PLAYER_MAX_HEALTH;

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
  }

  update(_time: number, _delta: number): void {
    this.handleMovement();
    this.handleAiming();
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
}
