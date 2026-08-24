import Phaser from 'phaser';
import { createPlayerStats } from '../config/balance';
import { GAME_TIMING, UI_DEPTH, WORLD } from '../config/constants';
import { COLORS, cssColor } from '../config/visual';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { Enemy } from '../entities/Enemy';
import { ExperienceOrb } from '../entities/ExperienceOrb';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { DesktopInput } from '../input/DesktopInput';
import { TouchInput } from '../input/TouchInput';
import { MemoryAnalyticsService } from '../services/AnalyticsService';
import { BrowserAudioService } from '../services/AudioService';
import { gameStorage, platform } from '../services/PlatformServices';
import { cloneDefaultSave, saveBestEffort } from '../services/StorageService';
import type { Unsubscribe } from '../services/YouTubePlayablesService';
import { BossHealthBar } from '../ui/BossHealthBar';
import { HUD } from '../ui/HUD';
import { UpgradeUI } from '../ui/UpgradeUI';
import { getDifficulty } from '../systems/DifficultySystem';
import { addXp } from '../systems/LevelSystem';
import { calculateCoins, calculateScoreBonus } from '../systems/ScoreSystem';
import { applyUpgrade, pickUpgradeOptions } from '../systems/UpgradeSystem';
import type {
  EnemyRuntimeData,
  EnemyType,
  GameMode,
  GameSaveData,
  PlayerStats,
  RunResult,
  UpgradeDefinition,
  UpgradeState,
} from '../types';

interface GameSceneData {
  save?: GameSaveData;
}

export class GameScene extends Phaser.Scene {
  private save: GameSaveData = cloneDefaultSave();
  private mode: GameMode = 'playing';
  private player!: Player;
  private stats!: PlayerStats;
  private desktopInput!: DesktopInput;
  private touchInput!: TouchInput;
  private hud!: HUD;
  private bossBar!: BossHealthBar;
  private upgradeUi: UpgradeUI | null = null;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerProjectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private xpOrbs!: Phaser.Physics.Arcade.Group;
  private graphics!: Phaser.GameObjects.Graphics;
  private audio = new BrowserAudioService();
  private analytics = new MemoryAnalyticsService();
  private platformUnsubscribers: Unsubscribe[] = [];
  private upgrades: UpgradeState = {};
  private level = 1;
  private xp = 0;
  private elapsedSeconds = 0;
  private score = 0;
  private kills = 0;
  private eliteKills = 0;
  private bossSpawned = false;
  private bossDefeated = false;
  private nextSpawnAt = 0;
  private nextAttackAt = 0;
  private boss: Enemy | null = null;
  private nextBossChargeAt = 0;
  private nextBossRadialAt = 0;
  private bossChargeVector = new Phaser.Math.Vector2();
  private bossRadialTelegraphUntil = 0;
  private bossRadialFired = false;
  private bossTelegraph: Phaser.GameObjects.GameObject | null = null;
  private bossRadialRing: Phaser.GameObjects.Arc | null = null;
  private bossRecoverUntil = 0;
  private lifecyclePaused = false;
  private platformPaused = false;
  private pendingUpgradeChoices = 0;
  private nextMoveSparkAt = 0;

  constructor() {
    super('GameScene');
  }

  init(data: GameSceneData): void {
    this.save = data.save ?? cloneDefaultSave();
  }

  create(): void {
    this.resetRunState();
    this.physics.world.resume();
    this.stats = createPlayerStats(this.save.permanentUpgrades);
    this.createWorld();
    this.createGroups();
    this.player = new Player(this, WORLD.width / 2, WORLD.height / 2, this.stats);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height).startFollow(this.player, true, 0.12, 0.12);
    this.desktopInput = new DesktopInput(this);
    this.touchInput = new TouchInput(this);
    this.hud = new HUD(this);
    this.bossBar = new BossHealthBar(this);
    this.registerPhysics();
    this.registerLifecycle();
    this.registerAudioUnlock();
    this.hud.showHint('Move to survive. Attacks are automatic.');
    this.analytics.track('game_started');
    void platform.initialize();
  }

  private resetRunState(): void {
    this.mode = 'playing';
    this.upgrades = {};
    this.level = 1;
    this.xp = 0;
    this.elapsedSeconds = 0;
    this.score = 0;
    this.kills = 0;
    this.eliteKills = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.nextSpawnAt = 0;
    this.nextAttackAt = 0;
    this.boss = null;
    this.nextBossChargeAt = 0;
    this.nextBossRadialAt = 0;
    this.bossChargeVector.set(0, 0);
    this.bossRadialTelegraphUntil = 0;
    this.bossRadialFired = false;
    this.bossTelegraph = null;
    this.bossRadialRing = null;
    this.bossRecoverUntil = 0;
    this.lifecyclePaused = false;
    this.platformPaused = false;
    this.upgradeUi = null;
    this.pendingUpgradeChoices = 0;
    this.nextMoveSparkAt = 0;
  }

  update(time: number, delta: number): void {
    if (this.lifecyclePaused || this.mode !== 'playing') {
      return;
    }

    const deltaSeconds = delta / 1000;
    this.elapsedSeconds += deltaSeconds;
    this.updatePlayer();
    this.updateSpawning(time);
    this.updateEnemies(time, deltaSeconds);
    this.updateProjectiles(time);
    this.updateXpOrbs(deltaSeconds);
    this.tryAutoAttack(time);
    this.updateBoss(time);
    this.updateHud();

    if (!this.bossSpawned && this.elapsedSeconds >= GAME_TIMING.bossSpawnSeconds) {
      this.spawnBoss(time);
    }
  }

  private createWorld(): void {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.graphics = this.add.graphics().setDepth(UI_DEPTH.world);
    this.graphics.fillStyle(COLORS.backgroundDeep, 1);
    this.graphics.fillRect(0, 0, WORLD.width, WORLD.height);
    this.graphics.fillStyle(COLORS.arenaBase, 0.86);
    this.graphics.fillRect(0, 0, WORLD.width, WORLD.height);
    this.graphics.fillStyle(COLORS.backgroundDeep, 0.38);
    this.graphics.fillCircle(WORLD.width * 0.18, WORLD.height * 0.2, 520);
    this.graphics.fillCircle(WORLD.width * 0.82, WORLD.height * 0.78, 620);
    this.graphics.lineStyle(1, COLORS.arenaGrid, 0.16);
    for (let x = 0; x <= WORLD.width; x += WORLD.tileSize) {
      this.graphics.lineBetween(x, 0, x, WORLD.height);
    }
    for (let y = 0; y <= WORLD.height; y += WORLD.tileSize) {
      this.graphics.lineBetween(0, y, WORLD.width, y);
    }
    this.graphics.lineStyle(2, COLORS.arenaAccent, 0.24);
    for (let x = WORLD.tileSize; x <= WORLD.width; x += WORLD.tileSize * 4) {
      this.graphics.lineBetween(x, WORLD.height * 0.16, x + WORLD.height * 0.18, WORLD.height * 0.84);
    }
    const centerX = WORLD.width / 2;
    const centerY = WORLD.height / 2;
    this.graphics.lineStyle(3, COLORS.arenaMark, 0.14);
    this.graphics.strokeCircle(centerX, centerY, 260);
    this.graphics.strokeCircle(centerX, centerY, 520);
    this.graphics.lineStyle(2, COLORS.playerProjectileCore, 0.1);
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      this.graphics.lineBetween(
        centerX + Math.cos(angle) * 300,
        centerY + Math.sin(angle) * 300,
        centerX + Math.cos(angle) * 620,
        centerY + Math.sin(angle) * 620,
      );
      this.graphics.fillStyle(COLORS.arenaMark, 0.12);
      this.graphics.fillCircle(centerX + Math.cos(angle) * 520, centerY + Math.sin(angle) * 520, 9);
    }
    this.graphics.lineStyle(4, COLORS.bossShell, 0.1);
    this.graphics.strokeCircle(centerX, centerY, 150);
    this.graphics.fillStyle(COLORS.arenaMark, 0.06);
    this.graphics.fillCircle(centerX, centerY, 92);
  }

  private createGroups(): void {
    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.playerProjectiles = this.physics.add.group({ runChildUpdate: false });
    this.enemyProjectiles = this.physics.add.group({ runChildUpdate: false });
    this.xpOrbs = this.physics.add.group({ runChildUpdate: false });

    for (let i = 0; i < 120; i += 1) {
      this.xpOrbs.add(new ExperienceOrb(this));
    }
    for (let i = 0; i < 90; i += 1) {
      this.playerProjectiles.add(new Projectile(this, 'player'));
    }
    for (let i = 0; i < 80; i += 1) {
      this.enemyProjectiles.add(new Projectile(this, 'enemy'));
    }
  }

  private registerPhysics(): void {
    this.physics.add.overlap(
      this.playerProjectiles,
      this.enemies,
      (projectile, enemy) => this.handlePlayerProjectileHit(projectile, enemy),
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.enemyProjectiles,
      this.player,
      (player, projectile) => this.handleEnemyProjectileHit(player, projectile),
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.xpOrbs,
      this.player,
      (first, second) => this.collectXp(first, second),
      undefined,
      this,
    );
  }

  private registerLifecycle(): void {
    this.platformUnsubscribers = [
      platform.onPause(() => this.handlePlatformPause()),
      platform.onResume(() => this.handlePlatformResume()),
      platform.onAudioEnabledChange((enabled) => this.audio.setPlatformAudioEnabled(enabled)),
    ];
    this.audio.setPlatformAudioEnabled(platform.isAudioEnabled());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.unlockAudio, this);
      this.input.keyboard?.off('keydown', this.unlockAudio, this);
      this.platformUnsubscribers.forEach((unsubscribe) => unsubscribe());
      this.platformUnsubscribers = [];
      this.touchInput.destroy();
      this.hud.destroy();
      this.bossBar.destroy();
    });
  }

  private handlePlatformPause(): void {
    if (this.platformPaused) {
      return;
    }
    this.platformPaused = true;
    this.lifecyclePaused = true;
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.input.enabled = false;
    this.audio.pause();
    void saveBestEffort(gameStorage, this.save);
  }

  private handlePlatformResume(): void {
    if (!this.platformPaused) {
      return;
    }
    this.platformPaused = false;
    this.lifecyclePaused = false;
    this.input.enabled = true;
    this.tweens.resumeAll();
    this.audio.resume();
    if (this.mode === 'playing') {
      this.physics.world.resume();
    }
  }

  private registerAudioUnlock(): void {
    this.input.once('pointerdown', this.unlockAudio, this);
    this.input.keyboard?.once('keydown', this.unlockAudio, this);
  }

  private unlockAudio(): void {
    this.audio.setMuted(false);
  }

  private updatePlayer(): void {
    const touch = this.touchInput.getVector();
    const vector = touch.lengthSq() > 0.01 ? touch : this.desktopInput.getVector();
    this.player.applyInput(vector);
    if (vector.lengthSq() > 0.01 && this.time.now >= this.nextMoveSparkAt) {
      this.nextMoveSparkAt = this.time.now + 130;
      this.createMovementSpark();
    }
  }

  private updateSpawning(time: number): void {
    if (time < this.nextSpawnAt) {
      return;
    }

    const difficulty = getDifficulty(this.elapsedSeconds, this.level);
    const bossPhase = this.bossSpawned && !this.bossDefeated;
    if (bossPhase) {
      this.nextSpawnAt = time + difficulty.spawnIntervalMs;
      return;
    }
    this.nextSpawnAt = time + difficulty.spawnIntervalMs * (bossPhase ? 1.9 : 1);
    const maxEnemies = difficulty.maxEnemies;
    if (this.enemies.countActive(true) >= maxEnemies) {
      return;
    }

    const type = Phaser.Utils.Array.GetRandom(difficulty.enemyTypes);
    const packSize = type === 'swarm' ? difficulty.swarmPackSize : 1;
    for (let i = 0; i < packSize; i += 1) {
      this.spawnEnemy(type, Math.random() < difficulty.eliteChance);
    }
  }

  private spawnEnemy(type: EnemyType, elite: boolean): void {
    const definition = ENEMY_DEFINITIONS[type];
    const spawn = this.pickSpawnPoint();
    const scale = 1 + this.elapsedSeconds / 170;
    const enemy = new Enemy(this, spawn.x, spawn.y, definition, elite, scale);
    this.enemies.add(enemy);
    this.tweens.add({ targets: enemy, alpha: { from: 0.25, to: 1 }, scale: enemy.scale * 1.06, duration: 180, yoyo: true });
    this.createSpawnFlash(enemy.x, enemy.y, elite ? COLORS.elite : definition.tint, elite ? 52 : 34);
  }

  private pickSpawnPoint(): Phaser.Math.Vector2 {
    const camera = this.cameras.main;
    const margin = 90;
    const side = Phaser.Math.Between(0, 3);
    let x = this.player.x;
    let y = this.player.y;

    if (side === 0) {
      x = camera.scrollX - margin;
      y = camera.scrollY + Phaser.Math.Between(0, camera.height);
    } else if (side === 1) {
      x = camera.scrollX + camera.width + margin;
      y = camera.scrollY + Phaser.Math.Between(0, camera.height);
    } else if (side === 2) {
      x = camera.scrollX + Phaser.Math.Between(0, camera.width);
      y = camera.scrollY - margin;
    } else {
      x = camera.scrollX + Phaser.Math.Between(0, camera.width);
      y = camera.scrollY + camera.height + margin;
    }

    const point = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(x, 40, WORLD.width - 40),
      Phaser.Math.Clamp(y, 40, WORLD.height - 40),
    );
    if (Phaser.Math.Distance.Squared(point.x, point.y, this.player.x, this.player.y) < 230 * 230) {
      return point
        .subtract(new Phaser.Math.Vector2(this.player.x, this.player.y))
        .normalize()
        .scale(260)
        .add(new Phaser.Math.Vector2(this.player.x, this.player.y));
    }
    return point;
  }

  private updateEnemies(time: number, deltaSeconds: number): void {
    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (!enemy.active) {
        return;
      }

      const data = enemy.dataModel;
      if (data.type === 'boss') {
        return;
      }

      const toPlayer = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y);
      const distance = Math.max(1, toPlayer.length());
      const direction = toPlayer.clone().scale(1 / distance);
      const desiredVelocity = this.getEnemyVelocity(data, direction, distance, time);
      enemy.setVelocity(desiredVelocity.x, desiredVelocity.y);
      enemy.rotation = direction.angle() + Math.PI / 2;

      if (data.behavior === 'ranged' && time >= data.nextAttackAt && distance < 480) {
        data.nextAttackAt = time + GAME_TIMING.rangedCooldownMs;
        this.fireEnemyProjectile(enemy.x, enemy.y, direction.angle(), 330, data.damage);
      }

      if (distance < data.radius + 24 && time >= data.contactReadyAt) {
        data.contactReadyAt = time + GAME_TIMING.contactDamageCooldownMs;
        this.damagePlayer(data.damage);
        enemy.setVelocity(-direction.x * 220, -direction.y * 220);
      }

      if (enemy.body) {
        const body = enemy.body as Phaser.Physics.Arcade.Body;
        body.velocity.limit(data.speed * (data.behavior === 'runner' ? 1.12 : 1));
      }
      enemy.setAngularVelocity(data.behavior === 'swarm' ? 90 : 0);
      if (data.behavior === 'swarm') {
        const body = enemy.body as Phaser.Physics.Arcade.Body;
        enemy.setVelocity(body.velocity.x + Math.sin(time / 170 + enemy.x) * 35, body.velocity.y);
      }
      enemy.setData('lifeSeconds', (Number(enemy.getData('lifeSeconds')) || 0) + deltaSeconds);
    });
  }

  private getEnemyVelocity(
    data: EnemyRuntimeData,
    direction: Phaser.Math.Vector2,
    distance: number,
    time: number,
  ): Phaser.Math.Vector2 {
    if (data.behavior === 'ranged') {
      if (distance < 250) {
        return direction.clone().scale(-data.speed);
      }
      if (distance > 380) {
        return direction.clone().scale(data.speed * 0.72);
      }
      return new Phaser.Math.Vector2(Math.sin(time / 420) * 45, Math.cos(time / 520) * 45);
    }

    const speed = data.behavior === 'runner' ? data.speed * 1.22 : data.speed;
    return direction.clone().scale(speed);
  }

  private tryAutoAttack(time: number): void {
    if (time < this.nextAttackAt) {
      return;
    }

    const target = this.findTarget();
    if (!target) {
      return;
    }

    this.nextAttackAt = time + 1000 / this.stats.attackSpeed;
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const count = this.stats.projectileCount;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * Phaser.Math.DegToRad(this.stats.projectileSpread);
      this.firePlayerProjectile(baseAngle + offset);
    }
    this.audio.play('shot');
  }

  private findTarget(): Enemy | null {
    if (this.boss?.active) {
      const bossDistance = Phaser.Math.Distance.Squared(this.player.x, this.player.y, this.boss.x, this.boss.y);
      if (bossDistance <= this.stats.attackRange * this.stats.attackRange * 1.35) {
        return this.boss;
      }
    }

    let target: Enemy | null = null;
    let bestDistance = this.stats.attackRange * this.stats.attackRange;
    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (!enemy.active) {
        return;
      }
      const distance = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        target = enemy;
      }
    });
    return target;
  }

  private firePlayerProjectile(angle: number): void {
    const projectile = this.getProjectile(this.playerProjectiles, 'player');
    const critical = Math.random() < this.stats.criticalChance;
    const damage = this.stats.damage * (critical ? this.stats.criticalDamage : 1);
    projectile.fire(this.player.x, this.player.y, angle, this.stats.projectileSpeed, {
      owner: 'player',
      damage,
      pierceLeft: this.stats.piercing,
      expiresAt: this.time.now + 1050,
      knockback: this.stats.knockback,
      size: this.stats.projectileSize,
    });
    if (critical) {
      projectile.setTint(0xfff07a);
    } else {
      projectile.clearTint();
    }
  }

  private fireEnemyProjectile(x: number, y: number, angle: number, speed: number, damage: number): void {
    const projectile = this.getProjectile(this.enemyProjectiles, 'enemy');
    projectile.fire(x, y, angle, speed, {
      owner: 'enemy',
      damage,
      pierceLeft: 0,
      expiresAt: this.time.now + 2800,
      knockback: 0,
      size: 1,
    });
    this.audio.play('bossAttack');
  }

  private getProjectile(group: Phaser.Physics.Arcade.Group, owner: 'player' | 'enemy'): Projectile {
    const existing = group.getChildren().find((child) => !child.active) as Projectile | undefined;
    if (existing) {
      return existing;
    }
    const projectile = new Projectile(this, owner);
    group.add(projectile);
    return projectile;
  }

  private handlePlayerProjectileHit(
    projectileObject: unknown,
    enemyObject: unknown,
  ): void {
    const projectile = this.asProjectile(projectileObject) ?? this.asProjectile(enemyObject);
    const enemy = this.asEnemy(projectileObject) ?? this.asEnemy(enemyObject);
    if (!projectile || !enemy) {
      return;
    }
    if (!projectile.active || !enemy.active) {
      return;
    }

    const data = projectile.projectileData;
    if (projectile.hitEnemies.has(enemy)) {
      return;
    }
    projectile.hitEnemies.add(enemy);
    this.damageEnemy(enemy, data.damage, data.knockback, true, 0, data.damage > this.stats.damage * 1.35);
    data.pierceLeft -= 1;
    if (data.pierceLeft < 0) {
      projectile.disableBody(true, true);
    }
  }

  private handleEnemyProjectileHit(
    _playerObject: unknown,
    projectileObject: unknown,
  ): void {
    const projectile = this.asProjectile(projectileObject) ?? this.asProjectile(_playerObject);
    if (!projectile) {
      return;
    }
    if (!projectile.active) {
      return;
    }
    this.damagePlayer(projectile.projectileData.damage);
    projectile.disableBody(true, true);
  }

  private damageEnemy(
    enemy: Enemy,
    amount: number,
    knockback: number,
    canExplode: boolean,
    explosionDepth: number,
    critical = false,
  ): void {
    const data = enemy.dataModel;
    data.health -= amount;
    this.showDamage(enemy.x, enemy.y, Math.floor(amount), critical ? cssColor(COLORS.critical) : data.elite ? '#fff5a8' : '#ffffff', critical);
    this.tweens.add({ targets: enemy, alpha: 0.45, duration: 55, yoyo: true });
    const push = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y).normalize().scale(knockback);
    const body = enemy.body as Phaser.Physics.Arcade.Body | null;
    enemy.setVelocity((body?.velocity.x ?? 0) + push.x, (body?.velocity.y ?? 0) + push.y);
    this.audio.play('hit');
    if (critical) {
      this.cameras.main.shake(55, 0.0025);
      this.createBurst(enemy.x, enemy.y, COLORS.critical, 5, 'gold-spark');
    }

    if (this.stats.lifesteal > 0) {
      this.stats.currentHealth = Math.min(this.stats.maxHealth, this.stats.currentHealth + amount * this.stats.lifesteal);
    }

    if (data.health <= 0) {
      this.killEnemy(enemy, canExplode, explosionDepth);
    }
  }

  private killEnemy(enemy: Enemy, canExplode: boolean, explosionDepth: number): void {
    const data = enemy.dataModel;
    const deathX = enemy.x;
    const deathY = enemy.y;
    this.score += data.score;
    this.kills += 1;
    if (data.elite) {
      this.eliteKills += 1;
    }
    if (data.type === 'boss') {
      this.bossDefeated = true;
      this.analytics.track('boss_defeated');
    }
    this.dropXp(deathX, deathY, data.xp);
    this.createBurst(deathX, deathY, data.elite ? 0xfff5a8 : 0xffffff);
    enemy.destroy();
    this.audio.play('enemyDeath');

    if (canExplode && this.stats.explosionOnKill > 0) {
      this.explode(
        deathX,
        deathY,
        this.stats.explosionOnKill,
        this.stats.damage * (1.4 + this.stats.chainReaction * 0.25),
        explosionDepth,
      );
    }

    if (data.type === 'boss') {
      this.cameras.main.shake(360, 0.012);
      const pulse = this.add.circle(deathX, deathY, 90, COLORS.boss, 0.28).setDepth(UI_DEPTH.effects);
      pulse.setStrokeStyle(4, 0xffffff, 0.72);
      this.tweens.add({ targets: pulse, scale: 2.1, alpha: 0, duration: 520, ease: 'Sine.Out', onComplete: () => pulse.destroy() });
      this.createBurst(deathX, deathY, COLORS.boss, 18, 'gold-spark');
      this.finishRun(true);
    }
  }

  private explode(x: number, y: number, radius: number, damage: number, chainDepth: number): void {
    const scaledRadius = radius * (1 + Math.min(chainDepth, this.stats.chainReaction) * 0.18);
    const circle = this.add.circle(x, y, scaledRadius, 0xffad5b, 0.22).setDepth(UI_DEPTH.effects);
    circle.setStrokeStyle(2, COLORS.critical, 0.46);
    this.tweens.add({ targets: circle, scale: 1.3, alpha: 0, duration: 260, onComplete: () => circle.destroy() });
    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (!enemy.active || Phaser.Math.Distance.Squared(x, y, enemy.x, enemy.y) > scaledRadius * scaledRadius) {
        return;
      }
      this.damageEnemy(enemy, damage, 120, chainDepth < this.stats.chainReaction, chainDepth + 1);
    });
  }

  private damagePlayer(rawDamage: number): void {
    const damage = Math.max(1, rawDamage - this.stats.armor);
    this.stats.currentHealth -= damage;
    this.cameras.main.shake(90, 0.004);
    this.showDamage(this.player.x, this.player.y - 24, Math.floor(damage), '#ff9aa8');
    this.tweens.add({ targets: this.player, alpha: 0.55, duration: 70, yoyo: true });
    this.audio.play('playerDamage');
    if (this.stats.currentHealth <= 0) {
      this.finishRun(false);
    }
  }

  private dropXp(x: number, y: number, value: number): void {
    const orb = (this.xpOrbs.getChildren().find((child) => !child.active) as ExperienceOrb | undefined) ?? new ExperienceOrb(this);
    if (!this.xpOrbs.contains(orb)) {
      this.xpOrbs.add(orb);
    }
    orb.drop(x, y, value);
  }

  private updateXpOrbs(deltaSeconds: number): void {
    this.xpOrbs.getChildren().forEach((gameObject) => {
      const orb = gameObject as ExperienceOrb;
      if (!orb.active) {
        return;
      }
      const distanceSq = Phaser.Math.Distance.Squared(orb.x, orb.y, this.player.x, this.player.y);
      if (distanceSq < this.stats.magnetRange * this.stats.magnetRange || this.time.now - orb.xpData.spawnedAt > 3500) {
        orb.xpData.attracted = true;
      }
      if (orb.xpData.attracted) {
        const direction = new Phaser.Math.Vector2(this.player.x - orb.x, this.player.y - orb.y).normalize();
        const speed = Phaser.Math.Clamp(420 - Math.sqrt(distanceSq), 180, 540);
        orb.setVelocity(direction.x * speed, direction.y * speed);
      } else {
        const body = orb.body as Phaser.Physics.Arcade.Body | null;
        orb.setVelocity((body?.velocity.x ?? 0) * (1 - deltaSeconds * 2), (body?.velocity.y ?? 0) * (1 - deltaSeconds * 2));
      }
    });
  }

  private collectXp(firstObject: unknown, secondObject: unknown): void {
    const orb = this.asXpOrb(firstObject) ?? this.asXpOrb(secondObject);
    if (!orb) {
      return;
    }
    if (!orb.active) {
      return;
    }
    const result = addXp(this.xp, this.level, orb.xpData.value);
    this.xp = result.xp;
    this.level = result.level;
    orb.disableBody(true, true);
    this.audio.play('xp');
    this.createPickupBurst(orb.x, orb.y);
    if (result.levelsGained > 0) {
      const firstGainedLevel = this.level - result.levelsGained + 1;
      for (let index = 0; index < result.levelsGained; index += 1) {
        this.analytics.track('player_level', { level: firstGainedLevel + index });
      }
      this.pendingUpgradeChoices += result.levelsGained;
      this.openNextUpgradeSelection();
    }
  }

  private asProjectile(value: unknown): Projectile | null {
    const gameObject = this.unwrapArcadeGameObject(value);
    return gameObject instanceof Projectile ? gameObject : null;
  }

  private asEnemy(value: unknown): Enemy | null {
    const gameObject = this.unwrapArcadeGameObject(value);
    return gameObject instanceof Enemy ? gameObject : null;
  }

  private asXpOrb(value: unknown): ExperienceOrb | null {
    const gameObject = this.unwrapArcadeGameObject(value);
    return gameObject instanceof ExperienceOrb ? gameObject : null;
  }

  private unwrapArcadeGameObject(value: unknown): unknown {
    if (value instanceof Phaser.Physics.Arcade.Body || value instanceof Phaser.Physics.Arcade.StaticBody) {
      return value.gameObject;
    }
    return value;
  }

  private openNextUpgradeSelection(): void {
    if (this.upgradeUi || this.pendingUpgradeChoices <= 0 || this.mode === 'game-over' || this.mode === 'victory') {
      return;
    }

    const options = pickUpgradeOptions(this.upgrades, 3);
    if (options.length === 0) {
      this.pendingUpgradeChoices = 0;
      this.mode = 'playing';
      this.physics.world.resume();
      return;
    }
    this.pendingUpgradeChoices -= 1;
    this.mode = 'level-up';
    this.physics.world.pause();
    this.player.setVelocity(0, 0);
    this.audio.play('levelUp');
    this.showLevelUpFlash();
    this.upgradeUi = new UpgradeUI(this, options, this.upgrades, (upgrade) => this.selectUpgrade(upgrade));
  }

  private selectUpgrade(upgrade: UpgradeDefinition): void {
    this.upgrades = applyUpgrade(this.stats, this.upgrades, upgrade);
    this.analytics.track('upgrade_selected', { id: upgrade.id, level: this.upgrades[upgrade.id] ?? 0 });
    this.upgradeUi?.destroy();
    this.upgradeUi = null;
    this.hud.showHint(upgrade.name);
    if (this.pendingUpgradeChoices > 0) {
      this.openNextUpgradeSelection();
      return;
    }
    this.mode = 'playing';
    this.physics.world.resume();
  }

  private updateProjectiles(time: number): void {
    this.playerProjectiles.getChildren().forEach((gameObject) => this.expireProjectile(gameObject as Projectile, time));
    this.enemyProjectiles.getChildren().forEach((gameObject) => this.expireProjectile(gameObject as Projectile, time));
  }

  private expireProjectile(projectile: Projectile, time: number): void {
    if (!projectile.active) {
      return;
    }
    if (
      time > projectile.projectileData.expiresAt ||
      projectile.x < -60 ||
      projectile.y < -60 ||
      projectile.x > WORLD.width + 60 ||
      projectile.y > WORLD.height + 60
    ) {
      projectile.disableBody(true, true);
    }
  }

  private spawnBoss(_time: number): void {
    this.bossSpawned = true;
    this.clearArenaForBossEntrance();
    this.showBossWarning();
    this.cameras.main.flash(180, 255, 238, 88, false);
    this.time.delayedCall(940, () => this.createBossEntity(this.time.now));
    this.cameras.main.shake(260, 0.006);
    this.audio.play('bossSpawn');
    this.analytics.track('boss_reached');
  }

  private createBossEntity(time: number): void {
    if (this.mode !== 'playing' || this.bossDefeated || this.boss?.active) {
      return;
    }
    const spawn = this.pickBossEntrancePoint();
    this.boss = new Enemy(this, spawn.x, spawn.y, ENEMY_DEFINITIONS.boss, false, 1);
    this.enemies.add(this.boss);
    this.boss.setAlpha(0.15).setScale(0.82);
    this.tweens.add({ targets: this.boss, alpha: 1, scale: 1, duration: 260, ease: 'Back.Out' });
    this.createSpawnFlash(this.boss.x, this.boss.y, COLORS.boss, 92);
    this.bossBar.show();
    this.nextBossChargeAt = time + 2500;
    this.nextBossRadialAt = time + 4200;
  }

  private pickBossEntrancePoint(): Phaser.Math.Vector2 {
    const camera = this.cameras.main;
    const shortLandscape = camera.width > camera.height && camera.height < 520;
    let x = camera.scrollX + camera.width * (shortLandscape ? 0.78 : 0.68);
    let y = camera.scrollY + camera.height * (shortLandscape ? 0.44 : 0.28);
    x = Phaser.Math.Clamp(x, camera.scrollX + 84, camera.scrollX + camera.width - 84);
    y = Phaser.Math.Clamp(y, camera.scrollY + 84, camera.scrollY + camera.height - 84);

    if (Phaser.Math.Distance.Squared(x, y, this.player.x, this.player.y) < 260 * 260) {
      x = this.player.x > camera.scrollX + camera.width / 2 ? camera.scrollX + 108 : camera.scrollX + camera.width - 108;
      y = camera.scrollY + camera.height * 0.42;
    }

    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(x, 90, WORLD.width - 90),
      Phaser.Math.Clamp(y, 90, WORLD.height - 90),
    );
  }

  private clearArenaForBossEntrance(): void {
    this.stats.currentHealth = this.stats.maxHealth;
    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (enemy.active && enemy.dataModel.type !== 'boss') {
        this.createBurst(enemy.x, enemy.y, 0xfff5a8);
        enemy.destroy();
      }
    });
    this.enemyProjectiles.getChildren().forEach((gameObject) => {
      const projectile = gameObject as Projectile;
      if (projectile.active) {
        projectile.disableBody(true, true);
      }
    });
  }

  private updateBoss(time: number): void {
    if (!this.boss?.active) {
      this.bossBar.hide();
      return;
    }

    const data = this.boss.dataModel;
    this.bossBar.update(data.health, data.maxHealth);

    const toPlayer = new Phaser.Math.Vector2(this.player.x - this.boss.x, this.player.y - this.boss.y);
    const distance = Math.max(1, toPlayer.length());
    const direction = toPlayer.clone().scale(1 / distance);

    if (data.telegraphUntil > time) {
      this.boss.setVelocity(0, 0);
    } else if (data.chargeUntil > time) {
      this.boss.setVelocity(this.bossChargeVector.x * 520, this.bossChargeVector.y * 520);
    } else if (this.bossRecoverUntil > time) {
      this.boss.setVelocity(0, 0);
    } else {
      data.chargeUntil = 0;
      this.boss.setVelocity(direction.x * data.speed, direction.y * data.speed);
      if (time >= this.nextBossChargeAt) {
        this.startBossCharge(time, direction);
      } else if (time >= this.nextBossRadialAt) {
        this.startBossRadial(time);
      }
    }

    if (this.bossRadialRing?.active) {
      this.bossRadialRing.setPosition(this.boss.x, this.boss.y);
    }

    if (this.bossRadialTelegraphUntil > 0 && time >= this.bossRadialTelegraphUntil && !this.bossRadialFired) {
      this.fireBossRadial();
      this.bossRadialFired = true;
    }

    this.boss.rotation = direction.angle() + Math.PI / 2;
    if (distance < data.radius + 28 && time >= data.contactReadyAt) {
      data.contactReadyAt = time + GAME_TIMING.contactDamageCooldownMs;
      this.damagePlayer(data.damage);
    }
  }

  private startBossCharge(time: number, direction: Phaser.Math.Vector2): void {
    if (!this.boss) {
      return;
    }
    this.bossChargeVector = direction.clone();
    this.boss.dataModel.telegraphUntil = time + 620;
    this.boss.dataModel.chargeUntil = time + 1320;
    this.bossRecoverUntil = time + 1600;
    this.nextBossChargeAt = time + GAME_TIMING.bossChargeCooldownMs;
    this.bossTelegraph?.destroy();
    const line = this.add.rectangle(this.boss.x, this.boss.y, 460, 44, COLORS.bossDanger, 0.22).setDepth(UI_DEPTH.effects);
    line.setStrokeStyle(2, COLORS.bossDanger, 0.5);
    line.rotation = direction.angle();
    this.bossTelegraph = line;
    this.tweens.add({ targets: line, alpha: 0, duration: 620, onComplete: () => line.destroy() });
  }

  private startBossRadial(time: number): void {
    if (!this.boss) {
      return;
    }
    this.bossRadialTelegraphUntil = time + 680;
    this.bossRadialFired = false;
    this.boss.dataModel.telegraphUntil = this.bossRadialTelegraphUntil;
    this.bossRecoverUntil = time + 980;
    this.nextBossRadialAt = time + GAME_TIMING.bossRadialCooldownMs;
    const ring = this.add.circle(this.boss.x, this.boss.y, 72, COLORS.boss, 0.12).setStrokeStyle(5, COLORS.boss, 0.7);
    ring.setDepth(UI_DEPTH.effects);
    this.bossRadialRing = ring;
    this.tweens.add({
      targets: ring,
      scale: 2.2,
      alpha: 0,
      duration: 680,
      onComplete: () => {
        ring.destroy();
        if (this.bossRadialRing === ring) {
          this.bossRadialRing = null;
        }
      },
    });
  }

  private fireBossRadial(): void {
    if (!this.boss) {
      return;
    }
    const projectileCount = 12;
    for (let i = 0; i < projectileCount; i += 1) {
      const angle = (Math.PI * 2 * i) / projectileCount;
      this.fireEnemyProjectile(this.boss.x, this.boss.y, angle, 245, this.boss.dataModel.damage * 0.72);
    }
  }

  private showDamage(x: number, y: number, amount: number, color: string, critical = false): void {
    const text = this.add
      .text(x, y, critical ? `*${amount}` : String(amount), {
        color,
        fontSize: critical ? '20px' : '16px',
        fontStyle: '900',
        stroke: '#07131a',
        strokeThickness: critical ? 5 : 4,
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH.effects);
    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      duration: 520,
      onComplete: () => text.destroy(),
    });
  }

  private createBurst(x: number, y: number, color: number, count = 7, texture = 'spark'): void {
    for (let i = 0; i < count; i += 1) {
      const spark = this.add.image(x, y, texture).setTint(color).setDepth(UI_DEPTH.effects);
      const angle = (Math.PI * 2 * i) / count;
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * Phaser.Math.Between(24, count > 10 ? 88 : 58),
        y: y + Math.sin(angle) * Phaser.Math.Between(24, count > 10 ? 88 : 58),
        alpha: 0,
        scale: 0.25,
        duration: 320,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private createSpawnFlash(x: number, y: number, color: number, radius: number): void {
    const ring = this.add.circle(x, y, radius, color, 0).setStrokeStyle(3, color, 0.42).setDepth(UI_DEPTH.effects);
    this.tweens.add({ targets: ring, scale: 1.35, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
  }

  private createPickupBurst(x: number, y: number): void {
    const flash = this.add.circle(x, y, 14, COLORS.xp, 0.18).setDepth(UI_DEPTH.effects);
    this.tweens.add({ targets: flash, scale: 1.9, alpha: 0, duration: 220, onComplete: () => flash.destroy() });
  }

  private createMovementSpark(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    const speedSq = body ? body.velocity.lengthSq() : 0;
    if (speedSq < 10) {
      return;
    }
    const angle = body?.velocity.angle() ?? 0;
    const spark = this.add.image(
      this.player.x - Math.cos(angle) * 18 + Phaser.Math.Between(-5, 5),
      this.player.y - Math.sin(angle) * 18 + Phaser.Math.Between(-5, 5),
      'spark',
    );
    spark.setTint(COLORS.playerProjectileCore).setDepth(UI_DEPTH.effects).setAlpha(0.56).setScale(0.8);
    this.tweens.add({ targets: spark, alpha: 0, scale: 0.15, duration: 260, onComplete: () => spark.destroy() });
  }

  private showLevelUpFlash(): void {
    const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, COLORS.xpBar, 0.08).setOrigin(0).setScrollFactor(0);
    flash.setDepth(UI_DEPTH.overlay - 2);
    this.tweens.add({ targets: flash, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
  }

  private showBossWarning(): void {
    const shortLandscape = this.scale.width > this.scale.height && this.scale.height < 520;
    const width = Math.min(this.scale.width - 48, 480);
    const y = shortLandscape ? this.scale.height * 0.52 : Math.min(this.scale.height * 0.32, 230);
    const banner = this.add.rectangle(this.scale.width / 2, y, width, shortLandscape ? 38 : 48, COLORS.bossDanger, 0.2);
    banner.setStrokeStyle(2, COLORS.boss, 0.5);
    const text = this.add
      .text(this.scale.width / 2, y, 'BOSS INCOMING', {
        color: '#fff5a8',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: this.scale.width < 520 || shortLandscape ? '18px' : '24px',
        fontStyle: '900',
        stroke: '#07131a',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    [banner, text].forEach((item) => item.setScrollFactor(0).setDepth(UI_DEPTH.hud + 5));
    this.tweens.add({ targets: [banner, text], alpha: 0, delay: 620, duration: 220, onComplete: () => {
      banner.destroy();
      text.destroy();
    } });
  }

  private updateHud(): void {
    this.hud.update({
      stats: this.stats,
      level: this.level,
      xp: this.xp,
      score: this.score + calculateScoreBonus(this.elapsedSeconds, this.kills, this.eliteKills),
      coins: this.save.coins,
      timeSeconds: this.elapsedSeconds,
      kills: this.kills,
    });
  }

  private finishRun(victory: boolean): void {
    if (this.mode === 'game-over' || this.mode === 'victory') {
      return;
    }
    this.mode = victory ? 'victory' : 'game-over';
    this.physics.world.pause();
    this.audio.play(victory ? 'victory' : 'gameOver');
    this.analytics.track(victory ? 'victory' : 'game_over');
    const finalScore = this.score + calculateScoreBonus(this.elapsedSeconds, this.kills, this.eliteKills);
    const result: RunResult = {
      victory,
      score: finalScore,
      kills: this.kills,
      eliteKills: this.eliteKills,
      bossDefeated: this.bossDefeated,
      survivalSeconds: this.elapsedSeconds,
      coinsEarned: calculateCoins(finalScore, this.kills, victory, this.bossDefeated),
      playerLevel: this.level,
    };
    this.time.delayedCall(650, () => {
      this.physics.world.resume();
      this.scene.start('ResultScene', { save: this.save, result });
    });
  }
}
