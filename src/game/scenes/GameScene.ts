import Phaser from 'phaser';
import { createPlayerStats } from '../config/balance';
import { GAME_TIMING, UI_DEPTH, WORLD } from '../config/constants';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { Enemy } from '../entities/Enemy';
import { ExperienceOrb } from '../entities/ExperienceOrb';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { DesktopInput } from '../input/DesktopInput';
import { TouchInput } from '../input/TouchInput';
import { MemoryAnalyticsService } from '../services/AnalyticsService';
import { BrowserAudioService } from '../services/AudioService';
import { cloneDefaultSave } from '../services/StorageService';
import { LocalYouTubePlayablesService } from '../services/YouTubePlayablesService';
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
  private youtube = new LocalYouTubePlayablesService();
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
  private lifecyclePaused = false;

  constructor() {
    super('GameScene');
  }

  init(data: GameSceneData): void {
    this.save = data.save ?? cloneDefaultSave();
  }

  create(): void {
    this.mode = 'playing';
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
    this.hud.showHint('Move to survive. Attacks are automatic.');
    this.analytics.track('game_started');
    void this.youtube.initialize();
    this.youtube.signalFirstFrame();
    this.youtube.signalGameReady();
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
    this.graphics.fillStyle(0x162131, 1);
    this.graphics.fillRect(0, 0, WORLD.width, WORLD.height);
    this.graphics.lineStyle(1, 0x284357, 0.45);
    for (let x = 0; x <= WORLD.width; x += WORLD.tileSize) {
      this.graphics.lineBetween(x, 0, x, WORLD.height);
    }
    for (let y = 0; y <= WORLD.height; y += WORLD.tileSize) {
      this.graphics.lineBetween(0, y, WORLD.width, y);
    }
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
      (orb) => this.collectXp(orb),
      undefined,
      this,
    );
  }

  private registerLifecycle(): void {
    this.youtube.onPause(() => {
      if (this.mode === 'playing') {
        this.lifecyclePaused = true;
        this.physics.world.pause();
        this.audio.pause();
      }
    });
    this.youtube.onResume(() => {
      if (this.lifecyclePaused) {
        this.lifecyclePaused = false;
        this.physics.world.resume();
        this.audio.resume();
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.touchInput.destroy();
      this.hud.destroy();
      this.bossBar.destroy();
      this.youtube.dispose();
    });
  }

  private updatePlayer(): void {
    const touch = this.touchInput.getVector();
    const vector = touch.lengthSq() > 0.01 ? touch : this.desktopInput.getVector();
    this.player.applyInput(vector);
  }

  private updateSpawning(time: number): void {
    if (time < this.nextSpawnAt) {
      return;
    }

    const difficulty = getDifficulty(this.elapsedSeconds, this.level);
    this.nextSpawnAt = time + difficulty.spawnIntervalMs;
    if (this.enemies.countActive(true) >= difficulty.maxEnemies) {
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
    const projectile = projectileObject as Projectile;
    const enemy = enemyObject as Enemy;
    if (!projectile.active || !enemy.active) {
      return;
    }

    const data = projectile.projectileData;
    this.damageEnemy(enemy, data.damage, data.knockback, true);
    data.pierceLeft -= 1;
    if (data.pierceLeft < 0) {
      projectile.disableBody(true, true);
    }
  }

  private handleEnemyProjectileHit(
    _playerObject: unknown,
    projectileObject: unknown,
  ): void {
    const projectile = projectileObject as Projectile;
    if (!projectile.active) {
      return;
    }
    this.damagePlayer(projectile.projectileData.damage);
    projectile.disableBody(true, true);
  }

  private damageEnemy(enemy: Enemy, amount: number, knockback: number, canExplode: boolean): void {
    const data = enemy.dataModel;
    data.health -= amount;
    this.showDamage(enemy.x, enemy.y, Math.floor(amount), data.elite ? '#fff5a8' : '#ffffff');
    this.tweens.add({ targets: enemy, alpha: 0.45, duration: 55, yoyo: true });
    const push = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y).normalize().scale(knockback);
    const body = enemy.body as Phaser.Physics.Arcade.Body | null;
    enemy.setVelocity((body?.velocity.x ?? 0) + push.x, (body?.velocity.y ?? 0) + push.y);
    this.audio.play('hit');

    if (this.stats.lifesteal > 0) {
      this.stats.currentHealth = Math.min(this.stats.maxHealth, this.stats.currentHealth + amount * this.stats.lifesteal);
    }

    if (data.health <= 0) {
      this.killEnemy(enemy, canExplode);
    }
  }

  private killEnemy(enemy: Enemy, canExplode: boolean): void {
    const data = enemy.dataModel;
    this.score += data.score;
    this.kills += 1;
    if (data.elite) {
      this.eliteKills += 1;
    }
    if (data.type === 'boss') {
      this.bossDefeated = true;
      this.analytics.track('boss_defeated');
    }
    this.dropXp(enemy.x, enemy.y, data.xp);
    this.createBurst(enemy.x, enemy.y, data.elite ? 0xfff5a8 : 0xffffff);
    enemy.destroy();
    this.audio.play('enemyDeath');

    if (canExplode && this.stats.explosionOnKill > 0) {
      this.explode(enemy.x, enemy.y, this.stats.explosionOnKill, this.stats.damage * (1.4 + this.stats.chainReaction * 0.25));
    }

    if (data.type === 'boss') {
      this.finishRun(true);
    }
  }

  private explode(x: number, y: number, radius: number, damage: number): void {
    const circle = this.add.circle(x, y, radius, 0xffad5b, 0.22).setDepth(UI_DEPTH.effects);
    this.tweens.add({ targets: circle, scale: 1.3, alpha: 0, duration: 260, onComplete: () => circle.destroy() });
    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (!enemy.active || Phaser.Math.Distance.Squared(x, y, enemy.x, enemy.y) > radius * radius) {
        return;
      }
      this.damageEnemy(enemy, damage, 120, false);
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
      if (distanceSq < this.stats.magnetRange * this.stats.magnetRange) {
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

  private collectXp(orbObject: unknown): void {
    const orb = orbObject as ExperienceOrb;
    if (!orb.active) {
      return;
    }
    const result = addXp(this.xp, this.level, orb.xpData.value);
    this.xp = result.xp;
    this.level = result.level;
    orb.disableBody(true, true);
    this.audio.play('xp');
    if (result.leveled) {
      this.analytics.track('player_level', { level: this.level });
      this.openUpgradeSelection();
    }
  }

  private openUpgradeSelection(): void {
    const options = pickUpgradeOptions(this.upgrades, 3);
    if (options.length === 0) {
      return;
    }
    this.mode = 'level-up';
    this.physics.world.pause();
    this.player.setVelocity(0, 0);
    this.audio.play('levelUp');
    this.upgradeUi = new UpgradeUI(this, options, (upgrade) => this.selectUpgrade(upgrade));
  }

  private selectUpgrade(upgrade: UpgradeDefinition): void {
    this.upgrades = applyUpgrade(this.stats, this.upgrades, upgrade);
    this.analytics.track('upgrade_selected', { id: upgrade.id, level: this.upgrades[upgrade.id] ?? 0 });
    this.upgradeUi?.destroy();
    this.upgradeUi = null;
    this.mode = 'playing';
    this.physics.world.resume();
    this.hud.showHint(upgrade.name);
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

  private spawnBoss(time: number): void {
    this.bossSpawned = true;
    const spawn = this.pickSpawnPoint();
    this.boss = new Enemy(this, spawn.x, spawn.y, ENEMY_DEFINITIONS.boss, false, 1);
    this.enemies.add(this.boss);
    this.bossBar.show();
    this.nextBossChargeAt = time + 2500;
    this.nextBossRadialAt = time + 4200;
    this.cameras.main.shake(500, 0.008);
    this.hud.showHint('Boss incoming');
    this.audio.play('bossSpawn');
    this.analytics.track('boss_reached');
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
    } else {
      data.chargeUntil = 0;
      this.boss.setVelocity(direction.x * data.speed, direction.y * data.speed);
      if (time >= this.nextBossChargeAt) {
        this.startBossCharge(time, direction);
      }
      if (time >= this.nextBossRadialAt) {
        this.startBossRadial(time);
      }
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
    this.nextBossChargeAt = time + GAME_TIMING.bossChargeCooldownMs;
    this.bossTelegraph?.destroy();
    const line = this.add.rectangle(this.boss.x, this.boss.y, 420, 38, 0xff5065, 0.24).setDepth(UI_DEPTH.effects);
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
    this.nextBossRadialAt = time + GAME_TIMING.bossRadialCooldownMs;
    const ring = this.add.circle(this.boss.x, this.boss.y, 72, 0xffe867, 0.12).setStrokeStyle(4, 0xffe867, 0.65);
    ring.setDepth(UI_DEPTH.effects);
    this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 680, onComplete: () => ring.destroy() });
  }

  private fireBossRadial(): void {
    if (!this.boss) {
      return;
    }
    for (let i = 0; i < 16; i += 1) {
      const angle = (Math.PI * 2 * i) / 16;
      this.fireEnemyProjectile(this.boss.x, this.boss.y, angle, 275, this.boss.dataModel.damage * 0.8);
    }
  }

  private showDamage(x: number, y: number, amount: number, color: string): void {
    const text = this.add
      .text(x, y, String(amount), {
        color,
        fontSize: '16px',
        fontStyle: '900',
        stroke: '#11131f',
        strokeThickness: 4,
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

  private createBurst(x: number, y: number, color: number): void {
    for (let i = 0; i < 7; i += 1) {
      const spark = this.add.image(x, y, 'spark').setTint(color).setDepth(UI_DEPTH.effects);
      const angle = (Math.PI * 2 * i) / 7;
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * Phaser.Math.Between(24, 58),
        y: y + Math.sin(angle) * Phaser.Math.Between(24, 58),
        alpha: 0,
        scale: 0.25,
        duration: 320,
        onComplete: () => spark.destroy(),
      });
    }
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
    this.youtube.sendScore(finalScore);
    this.time.delayedCall(650, () => {
      this.physics.world.resume();
      this.scene.start('ResultScene', { save: this.save, result });
    });
  }
}
