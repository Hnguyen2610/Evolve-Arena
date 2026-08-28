import Phaser from 'phaser';
import { BOSS_BALANCE, calculateProjectileVolleyDamageScale, createPlayerStats } from '../config/balance';
import { GAME_TIMING, UI_DEPTH, WORLD } from '../config/constants';
import { COLORS, cssColor } from '../config/visual';
import { getChapterForStage } from '../data/chapters';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { DEFAULT_STAGE_ID, getStageDefinition, isStageId } from '../data/stages';
import { Enemy } from '../entities/Enemy';
import { ExperienceOrb } from '../entities/ExperienceOrb';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { DesktopInput } from '../input/DesktopInput';
import { TouchInput } from '../input/TouchInput';
import { MemoryAnalyticsService } from '../services/AnalyticsService';
import { gameAudio, playtestTelemetry } from '../services/PlatformServices';
import { setLatestSaveSnapshot } from '../services/PersistenceCoordinator';
import { cloneDefaultSave } from '../services/StorageService';
import { BossHealthBar } from '../ui/BossHealthBar';
import { HUD } from '../ui/HUD';
import { UpgradeUI } from '../ui/UpgradeUI';
import { getDifficulty } from '../systems/DifficultySystem';
import { addXp } from '../systems/LevelSystem';
import { calculateCoins, calculateScoreBonus } from '../systems/ScoreSystem';
import { applyUpgrade, pickUpgradeOptions } from '../systems/UpgradeSystem';
import { isStageUnlocked } from '../systems/StageProgressionSystem';
import {
  getArenaSectorForPoint,
  getArenaShiftState,
  isSectorDangerous,
  type ArenaShiftPhase,
  type ArenaShiftState,
  type ForcedArenaShift,
} from '../systems/ArenaStateSystem';
import type {
  EnemyDefinition,
  EnemyRuntimeData,
  EnemyType,
  GameMode,
  GameSaveData,
  PlayerStats,
  RunResult,
  StageDefinition,
  StageId,
  UpgradeDefinition,
  UpgradeState,
} from '../types';

interface GameSceneData {
  save?: GameSaveData;
  replay?: boolean;
  stageId?: StageId;
}

interface StageHazardInstance {
  zone: Phaser.GameObjects.Arc;
  core: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  activeAt: number;
  expiresAt: number;
  damageApplied: boolean;
}

const ENERGY_NODE_TYPE: EnemyType = 'energy-node';
const GUARDIAN_LINK_RANGE = 175;
const GUARDIAN_PROTECTION_MULTIPLIER = 0.68;

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
  private arenaFx!: Phaser.GameObjects.Graphics;
  private foregroundFx!: Phaser.GameObjects.Graphics;
  private audio = gameAudio;
  private analytics = new MemoryAnalyticsService();
  private stage: StageDefinition = getStageDefinition(DEFAULT_STAGE_ID);
  private replayStart = false;
  private currentOfferedUpgradeIds: string[] = [];
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
  private pendingUpgradeChoices = 0;
  private nextMoveSparkAt = 0;
  private arenaVisualPhase = -1;
  private nextAmbientSparkAt = 0;
  private nextStageHazardAt = 0;
  private stageHazards: StageHazardInstance[] = [];
  private nextEnergyNodeAt = 0;
  private nextBossSupportNodeAt = 0;
  private nextTelemetryProgressAt = 0;
  private damageTaken = 0;
  private energyNodesDestroyed = 0;
  private energyNodePressureHits = 0;
  private arenaShiftPhase: ArenaShiftPhase = 'stable';
  private arenaShiftCycleIndex = -1;
  private forcedArenaShift: ForcedArenaShift | null = null;
  private nextOverloadDamageAt = 0;
  private arenaShifts = 0;
  private overloadEvents = 0;
  private overloadHits = 0;

  constructor() {
    super('GameScene');
  }

  init(data: GameSceneData): void {
    this.save = data.save ?? cloneDefaultSave();
    this.replayStart = data.replay === true;
    const requestedStageId = isStageId(data.stageId) ? data.stageId : DEFAULT_STAGE_ID;
    const playableStageId = isStageUnlocked(this.save, requestedStageId) ? requestedStageId : DEFAULT_STAGE_ID;
    this.stage = getStageDefinition(playableStageId);
  }

  create(): void {
    this.resetRunState();
    setLatestSaveSnapshot(this.save);
    playtestTelemetry.beginRun(this.replayStart ? 'replay' : 'new', this.stage.id, this.stage.chapterId);
    this.physics.world.resume();
    this.stats = createPlayerStats(this.save.permanentUpgrades);
    this.createWorld();
    this.createGroups();
    this.player = new Player(this, WORLD.width / 2, WORLD.height / 2, this.stats);
    this.player.updateEvolutionVisuals(this.upgrades);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height).startFollow(this.player, true, 0.12, 0.12);
    this.desktopInput = new DesktopInput(this);
    this.touchInput = new TouchInput(this);
    this.hud = new HUD(this);
    this.bossBar = new BossHealthBar(this);
    this.registerPhysics();
    this.registerLifecycle();
    this.registerAudioUnlock();
    this.hud.showHint(`${this.stage.name}: move to survive.`);
    this.analytics.track(this.replayStart ? 'replay_started' : 'game_started', { stageId: this.stage.id, chapterId: this.stage.chapterId });
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
    this.upgradeUi = null;
    this.pendingUpgradeChoices = 0;
    this.nextMoveSparkAt = 0;
    this.arenaVisualPhase = -1;
    this.nextAmbientSparkAt = 0;
    this.nextStageHazardAt = 0;
    this.nextEnergyNodeAt = 0;
    this.nextBossSupportNodeAt = 0;
    this.nextTelemetryProgressAt = 0;
    this.damageTaken = 0;
    this.energyNodesDestroyed = 0;
    this.energyNodePressureHits = 0;
    this.arenaShiftPhase = 'stable';
    this.arenaShiftCycleIndex = -1;
    this.forcedArenaShift = null;
    this.nextOverloadDamageAt = 0;
    this.arenaShifts = 0;
    this.overloadEvents = 0;
    this.overloadHits = 0;
    this.stageHazards.forEach((hazard) => {
      hazard.zone.destroy();
      hazard.core.destroy();
    });
    this.stageHazards = [];
  }

  update(time: number, delta: number): void {
    if (this.mode !== 'playing') {
      return;
    }

    const deltaSeconds = delta / 1000;
    this.elapsedSeconds += deltaSeconds;
    this.updateArenaVisuals(time);
    this.updateArenaShift(time);
    this.updatePlayer();
    this.updateSpawning(time);
    this.updateEnemies(time, deltaSeconds);
    this.updateEnergyNodes(time);
    this.drawGuardianLinks();
    this.updateStageHazards(time);
    this.updateProjectiles(time);
    this.updateXpOrbs(deltaSeconds);
    this.tryAutoAttack(time);
    this.updateBoss(time);
    this.updateTelemetryProgress(time);
    this.updateHud();

    if (!this.bossSpawned && this.elapsedSeconds >= this.stage.bossSpawnSeconds) {
      this.spawnBoss(time);
    }
  }

  private createWorld(): void {
    const theme = this.stage.visualTheme;
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.graphics = this.add.graphics().setDepth(UI_DEPTH.world);
    this.graphics.fillStyle(theme.backgroundDeep, 1);
    this.graphics.fillRect(0, 0, WORLD.width, WORLD.height);
    this.graphics.fillStyle(theme.arenaBase, 0.86);
    this.graphics.fillRect(0, 0, WORLD.width, WORLD.height);
    this.graphics.fillStyle(theme.backgroundDeep, 0.38);
    this.graphics.fillCircle(WORLD.width * 0.18, WORLD.height * 0.2, 520);
    this.graphics.fillCircle(WORLD.width * 0.82, WORLD.height * 0.78, 620);
    this.graphics.lineStyle(1, theme.arenaGrid, 0.16);
    for (let x = 0; x <= WORLD.width; x += WORLD.tileSize) {
      this.graphics.lineBetween(x, 0, x, WORLD.height);
    }
    for (let y = 0; y <= WORLD.height; y += WORLD.tileSize) {
      this.graphics.lineBetween(0, y, WORLD.width, y);
    }
    this.graphics.lineStyle(2, theme.arenaAccent, 0.24);
    for (let x = WORLD.tileSize; x <= WORLD.width; x += WORLD.tileSize * 4) {
      this.graphics.lineBetween(x, WORLD.height * 0.16, x + WORLD.height * 0.18, WORLD.height * 0.84);
    }
    const centerX = WORLD.width / 2;
    const centerY = WORLD.height / 2;
    this.graphics.lineStyle(3, theme.arenaMark, 0.14);
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
      this.graphics.fillStyle(theme.arenaMark, 0.12);
      this.graphics.fillCircle(centerX + Math.cos(angle) * 520, centerY + Math.sin(angle) * 520, 9);
    }
    this.graphics.lineStyle(4, theme.bossShell, 0.1);
    this.graphics.strokeCircle(centerX, centerY, 150);
    this.graphics.fillStyle(theme.arenaMark, 0.06);
    this.graphics.fillCircle(centerX, centerY, 92);
    this.arenaFx = this.add.graphics().setDepth(UI_DEPTH.world + 1);
    this.foregroundFx = this.add.graphics().setDepth(UI_DEPTH.effects - 1);
  }

  private updateArenaVisuals(time: number): void {
    const theme = this.stage.visualTheme;
    const phase = this.getArenaVisualPhase();
    if (phase !== this.arenaVisualPhase) {
      if (this.arenaVisualPhase >= 0) {
        this.createArenaPhasePulse(phase);
      }
      this.arenaVisualPhase = phase;
    }

    const camera = this.cameras.main;
    const left = camera.scrollX;
    const top = camera.scrollY;
    const width = camera.width;
    const height = camera.height;
    const centerX = WORLD.width / 2;
    const centerY = WORLD.height / 2;
    const bossPhase = phase >= 3;
    const color = bossPhase ? theme.boss : phase >= 2 ? theme.phase3 : phase >= 1 ? theme.phase2 : theme.arenaMark;
    const intensity = 0.18 + phase * 0.2 + (bossPhase ? 0.18 : 0);
    const scanOffset = (time / (34 - Math.min(phase, 2) * 6)) % WORLD.tileSize;

    this.arenaFx.clear();
    this.arenaFx.lineStyle(1, color, 0.05 + intensity * 0.08);
    for (let y = top - WORLD.tileSize + scanOffset; y < top + height + WORLD.tileSize; y += WORLD.tileSize) {
      this.arenaFx.lineBetween(left - 80, y, left + width + 80, y + phase * 10);
    }
    this.arenaFx.lineStyle(2, color, 0.06 + intensity * 0.1);
    for (let i = 0; i < 4 + phase; i += 1) {
      const radius = 210 + i * 155 + Math.sin(time / 680 + i) * (10 + phase * 6);
      this.arenaFx.strokeCircle(centerX, centerY, radius);
    }
    if (phase >= 1) {
      this.arenaFx.lineStyle(2, theme.phase2, 0.09 + phase * 0.035);
      for (let i = 0; i < 7; i += 1) {
        const angle = time / 2300 + (Math.PI * 2 * i) / 7;
        this.arenaFx.lineBetween(
          centerX + Math.cos(angle) * 190,
          centerY + Math.sin(angle) * 190,
          centerX + Math.cos(angle) * (620 + phase * 90),
          centerY + Math.sin(angle) * (620 + phase * 90),
        );
      }
    }
    if (phase >= 2) {
      this.arenaFx.lineStyle(3, theme.phase3, 0.11 + (bossPhase ? 0.06 : 0));
      for (let i = 0; i < 5; i += 1) {
        const angle = -time / 1900 + (Math.PI * 2 * i) / 5;
        const x = centerX + Math.cos(angle) * 520;
        const y = centerY + Math.sin(angle) * 360;
        this.arenaFx.lineBetween(x - 54, y + 18, x + 72, y - 26);
      }
    }
    if (this.boss?.active) {
      this.arenaFx.lineStyle(4, theme.boss, 0.18 + Math.sin(time / 170) * 0.05);
      this.arenaFx.strokeCircle(this.boss.x, this.boss.y, 150 + Math.sin(time / 210) * 9);
      this.arenaFx.lineStyle(2, theme.bossDanger, 0.2);
      this.arenaFx.strokeCircle(this.boss.x, this.boss.y, 236 + Math.sin(time / 360) * 18);
    }

    this.foregroundFx.clear();
    if (phase > 0) {
      this.foregroundFx.fillStyle(theme.foreground, 0.05 + phase * 0.012);
      const particleCount = camera.width < 700 ? 8 + phase * 2 : 12 + phase * 3;
      for (let i = 0; i < particleCount; i += 1) {
        const seed = i * 113.37;
        const x = left + ((seed + time * (0.012 + phase * 0.004)) % (width + 80)) - 40;
        const y = top + (((seed * 1.73) + time * (0.018 + phase * 0.005)) % (height + 80)) - 40;
        this.foregroundFx.fillCircle(x, y, 1.4 + (i % 3) * 0.7);
      }
    }

    if (phase > 0 && time >= this.nextAmbientSparkAt) {
      this.nextAmbientSparkAt = time + Math.max(260, 680 - phase * 130);
      this.createAmbientSpark(color, phase);
    }
  }

  private updateArenaShift(time: number): void {
    const config = this.stage.arenaShift;
    const state = getArenaShiftState(config, this.elapsedSeconds, this.forcedArenaShift);
    this.clearExpiredForcedArenaShift();

    if (state.enabled && (state.phase !== this.arenaShiftPhase || state.cycleIndex !== this.arenaShiftCycleIndex)) {
      if (state.phase === 'warning') {
        this.arenaShifts += 1;
        playtestTelemetry.recordArenaShift(state.phase, this.elapsedSeconds);
        this.hud.showHint('Grid sectors shifting.');
      } else if (state.phase === 'overload') {
        this.overloadEvents += 1;
        playtestTelemetry.recordOverloadStarted(this.elapsedSeconds);
        this.hud.showHint('Avoid overload lanes.');
        this.audio.play('bossAttack');
      }
      this.arenaShiftPhase = state.phase;
      this.arenaShiftCycleIndex = state.cycleIndex;
    }

    this.drawArenaShiftState(state, time);
    this.applyArenaOverloadDamage(state, time);
  }

  private clearExpiredForcedArenaShift(): void {
    if (!this.forcedArenaShift) {
      return;
    }
    const duration = this.forcedArenaShift.warningMs + this.forcedArenaShift.overloadMs + this.forcedArenaShift.recoveryMs;
    if (this.elapsedSeconds * 1000 >= this.forcedArenaShift.startedAtMs + duration) {
      this.forcedArenaShift = null;
    }
  }

  private drawArenaShiftState(state: ArenaShiftState, time: number): void {
    if (!state.enabled || state.dangerousSectors.length === 0) {
      return;
    }
    const config = this.stage.arenaShift;
    const theme = this.stage.visualTheme;
    const centerX = WORLD.width / 2;
    const centerY = WORLD.height / 2;
    const radius = Math.max(WORLD.width, WORLD.height) * 0.84;
    const sectorAngle = (Math.PI * 2) / Math.max(1, config.sectors);
    const fillAlpha = state.phase === 'overload' ? 0.14 : 0.07 + Math.sin(time / 90) * 0.018;
    const lineAlpha = state.phase === 'overload' ? 0.52 : 0.36;

    state.dangerousSectors.forEach((sector) => {
      const start = sector * sectorAngle - Math.PI / 2;
      const end = start + sectorAngle;
      this.foregroundFx.fillStyle(theme.hazard, fillAlpha);
      this.foregroundFx.beginPath();
      this.foregroundFx.moveTo(centerX, centerY);
      this.foregroundFx.arc(centerX, centerY, radius, start, end, false);
      this.foregroundFx.closePath();
      this.foregroundFx.fillPath();
      this.foregroundFx.lineStyle(state.phase === 'overload' ? 4 : 2, theme.hazard, lineAlpha);
      this.foregroundFx.beginPath();
      this.foregroundFx.moveTo(centerX, centerY);
      this.foregroundFx.lineTo(centerX + Math.cos(start) * radius, centerY + Math.sin(start) * radius);
      this.foregroundFx.moveTo(centerX, centerY);
      this.foregroundFx.lineTo(centerX + Math.cos(end) * radius, centerY + Math.sin(end) * radius);
      this.foregroundFx.strokePath();
    });
  }

  private applyArenaOverloadDamage(state: ArenaShiftState, time: number): void {
    if (!state.enabled || state.phase !== 'overload' || time < this.nextOverloadDamageAt) {
      return;
    }
    const sector = getArenaSectorForPoint(
      this.player.x,
      this.player.y,
      WORLD.width / 2,
      WORLD.height / 2,
      this.stage.arenaShift.sectors,
    );
    if (!isSectorDangerous(state, sector)) {
      return;
    }
    this.nextOverloadDamageAt = time + this.stage.arenaShift.damageCooldownMs;
    this.overloadHits += 1;
    playtestTelemetry.recordOverloadHit(this.elapsedSeconds);
    this.damagePlayer(this.stage.arenaShift.damage);
    this.createBurst(this.player.x, this.player.y, this.stage.visualTheme.hazard, 6, 'danger-spark');
  }

  private forceArenaOverload(time: number, warningMs = 1150, overloadMs = 2900, recoveryMs = 1700): void {
    if (!this.stage.arenaShift.enabled) {
      return;
    }
    this.forcedArenaShift = {
      startedAtMs: this.elapsedSeconds * 1000,
      warningMs,
      overloadMs,
      recoveryMs,
      cycleIndex: 100 + Math.floor(time / 1000),
    };
  }

  private isArenaOverloadActive(): boolean {
    return this.arenaShiftPhase === 'overload';
  }

  private getArenaVisualPhase(): number {
    if (this.bossSpawned && !this.bossDefeated) {
      return 3;
    }
    if (this.elapsedSeconds >= 60) {
      return 2;
    }
    if (this.elapsedSeconds >= 30) {
      return 1;
    }
    return 0;
  }

  private createArenaPhasePulse(phase: number): void {
    const camera = this.cameras.main;
    const x = camera.scrollX + camera.width / 2;
    const y = camera.scrollY + camera.height / 2;
    const theme = this.stage.visualTheme;
    const color = phase >= 3 ? theme.boss : phase >= 2 ? theme.phase3 : theme.phase2;
    const radius = Math.min(camera.width, camera.height) * 0.18;
    const ring = this.add.circle(x, y, radius, color, 0).setDepth(UI_DEPTH.effects - 2);
    ring.setStrokeStyle(4, color, phase >= 3 ? 0.46 : 0.28);
    this.tweens.add({
      targets: ring,
      scale: phase >= 3 ? 5.8 : 4.2,
      alpha: 0,
      duration: phase >= 3 ? 820 : 560,
      ease: 'Sine.Out',
      onComplete: () => ring.destroy(),
    });
  }

  private createAmbientSpark(color: number, phase: number): void {
    const camera = this.cameras.main;
    const count = camera.width < 700 ? 1 : Math.min(3, phase);
    for (let index = 0; index < count; index += 1) {
      const x = camera.scrollX + Phaser.Math.Between(40, Math.max(41, camera.width - 40));
      const y = camera.scrollY + Phaser.Math.Between(40, Math.max(41, camera.height - 40));
      const spark = this.add.image(x, y, phase >= 3 ? 'gold-spark' : 'spark').setTint(color).setDepth(UI_DEPTH.effects - 1).setAlpha(0.24);
      this.tweens.add({
        targets: spark,
        y: y - Phaser.Math.Between(24, 52),
        alpha: 0,
        scale: 0.12,
        duration: 520,
        onComplete: () => spark.destroy(),
      });
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
      (first, second) => this.collectXp(first, second),
      undefined,
      this,
    );
  }

  private registerLifecycle(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.unlockAudio, this);
      this.input.keyboard?.off('keydown', this.unlockAudio, this);
      this.touchInput.destroy();
      this.hud.destroy();
      this.bossBar.destroy();
      this.stageHazards.forEach((hazard) => {
        hazard.zone.destroy();
        hazard.core.destroy();
      });
      this.stageHazards = [];
    });
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

    const difficulty = getDifficulty(this.elapsedSeconds, this.level, this.stage);
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

  private spawnEnergyNode(preferredPoint?: Phaser.Math.Vector2): Enemy | null {
    if (!this.stage.energyNode.enabled || this.countActiveEnergyNodes() >= this.getEnergyNodeCap()) {
      return null;
    }

    const definition = ENEMY_DEFINITIONS[ENERGY_NODE_TYPE];
    const spawn = preferredPoint ?? this.pickEnergyNodePoint();
    const scale = 1 + this.elapsedSeconds / 210;
    const node = new Enemy(this, spawn.x, spawn.y, definition, false, scale);
    this.enemies.add(node);
    node.setVelocity(0, 0);
    node.setAlpha(0.2);
    node.dataModel.nextAttackAt = this.time.now + this.stage.energyNode.telegraphMs + 900;
    this.tweens.add({ targets: node, alpha: 1, scale: 1.08, duration: 240, yoyo: true, ease: 'Sine.Out' });
    this.createSpawnFlash(node.x, node.y, this.stage.visualTheme.hazard, 54);
    this.createEnergyNodeArrival(node.x, node.y);
    playtestTelemetry.recordEnergyNodeSpawned(this.elapsedSeconds);
    return node;
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
      if (data.behavior === 'boss') {
        return;
      }
      if (data.behavior === 'node') {
        enemy.setVelocity(0, 0);
        enemy.rotation += deltaSeconds * 1.35;
        enemy.setData('lifeSeconds', (Number(enemy.getData('lifeSeconds')) || 0) + deltaSeconds);
        return;
      }

      const toPlayer = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y);
      const distance = Math.max(1, toPlayer.length());
      const direction = toPlayer.clone().scale(1 / distance);
      const desiredVelocity = this.getEnemyVelocity(enemy, data, direction, distance, time);
      enemy.setVelocity(desiredVelocity.x, desiredVelocity.y);
      enemy.rotation = direction.angle() + Math.PI / 2;

      if (data.behavior === 'ranged' && time >= data.nextAttackAt && distance < 480) {
        if (data.type === 'pulse-caster') {
          data.nextAttackAt = time + GAME_TIMING.rangedCooldownMs + 580;
          this.firePulseCaster(enemy, direction.angle(), data.damage);
        } else {
          data.nextAttackAt = time + GAME_TIMING.rangedCooldownMs;
          this.fireEnemyProjectile(enemy.x, enemy.y, direction.angle(), 330, data.damage);
        }
      } else if (data.behavior === 'disruptor' && time >= data.nextAttackAt && distance < 560) {
        data.nextAttackAt = time + GAME_TIMING.rangedCooldownMs + 820;
        this.fireDisruptor(enemy, direction.angle(), data.damage);
      } else if (data.behavior === 'anchor' && time >= data.nextAttackAt && distance < 520) {
        data.nextAttackAt = time + (this.isArenaOverloadActive() ? 1650 : 2300);
        data.telegraphUntil = time + 380;
        this.fireAnchorBurst(enemy, direction.angle(), data.damage, this.isArenaOverloadActive());
      } else if (data.behavior === 'interceptor' && time >= data.nextAttackAt && distance < 560) {
        data.nextAttackAt = time + 2600;
        data.telegraphUntil = time + 360;
        data.chargeUntil = time + 900;
        enemy.setData('dashX', direction.x);
        enemy.setData('dashY', direction.y);
        this.showInterceptorDashTelegraph(enemy, direction.angle());
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
    enemy: Enemy,
    data: EnemyRuntimeData,
    direction: Phaser.Math.Vector2,
    distance: number,
    time: number,
  ): Phaser.Math.Vector2 {
    if (data.type === 'orbiter') {
      const orbit = new Phaser.Math.Vector2(-direction.y, direction.x).scale(data.speed * 0.72);
      const pressure = distance > 210 ? direction.clone().scale(data.speed * 0.72) : direction.clone().scale(data.speed * 0.16);
      return orbit.add(pressure);
    }
    if (data.behavior === 'ranged') {
      if (distance < 250) {
        return direction.clone().scale(-data.speed);
      }
      if (distance > 380) {
        return direction.clone().scale(data.speed * 0.72);
      }
      return new Phaser.Math.Vector2(Math.sin(time / 420) * 45, Math.cos(time / 520) * 45);
    }
    if (data.behavior === 'guardian') {
      const node = this.findNearestEnergyNode(enemy);
      if (node && Phaser.Math.Distance.Squared(enemy.x, enemy.y, node.x, node.y) > 92 * 92) {
        return new Phaser.Math.Vector2(node.x - enemy.x, node.y - enemy.y).normalize().scale(data.speed);
      }
      return direction.clone().scale(data.speed * 0.76);
    }
    if (data.behavior === 'disruptor') {
      if (distance < 230) {
        return direction.clone().scale(-data.speed * 0.9);
      }
      if (distance > 430) {
        return direction.clone().scale(data.speed * 0.72);
      }
      return new Phaser.Math.Vector2(Math.sin(time / 360) * 55, Math.cos(time / 420) * 55);
    }
    if (data.behavior === 'anchor') {
      if (data.telegraphUntil > time) {
        return new Phaser.Math.Vector2(0, 0);
      }
      if (distance < 230) {
        return direction.clone().scale(-data.speed * 0.64);
      }
      if (distance > 420) {
        return direction.clone().scale(data.speed * 0.48);
      }
      return new Phaser.Math.Vector2(-direction.y, direction.x).scale(data.speed * 0.22);
    }
    if (data.behavior === 'interceptor') {
      if (data.telegraphUntil > time) {
        return new Phaser.Math.Vector2(0, 0);
      }
      if (data.chargeUntil > time) {
        const dashX = Number(enemy.getData('dashX')) || direction.x;
        const dashY = Number(enemy.getData('dashY')) || direction.y;
        return new Phaser.Math.Vector2(dashX, dashY).normalize().scale(data.speed * 2.25);
      }
      const strafe = new Phaser.Math.Vector2(-direction.y, direction.x).scale(Math.sin(time / 260 + enemy.x) * 0.42);
      return direction.clone().add(strafe).normalize().scale(data.speed * 1.08);
    }

    const speed = data.behavior === 'runner' ? data.speed * 1.22 : data.speed;
    return direction.clone().scale(speed);
  }

  private firePulseCaster(enemy: Enemy, angle: number, damage: number): void {
    const color = this.stage.visualTheme.hazard;
    const ring = this.add.circle(enemy.x, enemy.y, 30, color, 0.12).setStrokeStyle(3, color, 0.5).setDepth(UI_DEPTH.effects);
    this.tweens.add({
      targets: ring,
      scale: 1.8,
      alpha: 0,
      duration: 360,
      ease: 'Sine.Out',
      onComplete: () => ring.destroy(),
    });
    this.time.delayedCall(260, () => {
      if (!enemy.active || this.mode !== 'playing') {
        return;
      }
      [-0.22, 0, 0.22].forEach((offset) => {
        this.fireEnemyProjectile(enemy.x, enemy.y, angle + offset, 300, damage * 0.78);
      });
    });
  }

  private fireDisruptor(enemy: Enemy, angle: number, damage: number): void {
    const color = this.stage.visualTheme.hazard;
    const telegraph = this.add.rectangle(enemy.x, enemy.y, 420, 22, color, 0.16).setDepth(UI_DEPTH.effects);
    telegraph.setStrokeStyle(2, color, 0.45);
    telegraph.rotation = angle;
    const core = this.add.circle(enemy.x, enemy.y, 20, color, 0.16).setStrokeStyle(2, color, 0.5).setDepth(UI_DEPTH.effects);
    this.tweens.add({ targets: telegraph, alpha: 0, duration: 420, onComplete: () => telegraph.destroy() });
    this.tweens.add({ targets: core, scale: 1.9, alpha: 0, duration: 420, onComplete: () => core.destroy() });
    this.time.delayedCall(320, () => {
      if (!enemy.active || this.mode !== 'playing') {
        return;
      }
      [-0.12, 0.12].forEach((offset) => {
        this.fireEnemyProjectile(enemy.x, enemy.y, angle + offset, 355, damage * 0.82);
      });
    });
  }

  private fireAnchorBurst(enemy: Enemy, angle: number, damage: number, overloaded: boolean): void {
    const color = this.stage.visualTheme.hazard;
    const ring = this.add.circle(enemy.x, enemy.y, overloaded ? 42 : 34, color, 0.1).setStrokeStyle(3, color, 0.56).setDepth(UI_DEPTH.effects);
    this.tweens.add({
      targets: ring,
      scale: overloaded ? 2.1 : 1.75,
      alpha: 0,
      duration: 380,
      ease: 'Sine.Out',
      onComplete: () => ring.destroy(),
    });
    this.time.delayedCall(300, () => {
      if (!enemy.active || this.mode !== 'playing') {
        return;
      }
      const offsets = overloaded ? [-0.44, -0.18, 0.18, 0.44] : [-0.28, 0, 0.28];
      offsets.forEach((offset) => {
        this.fireEnemyProjectile(enemy.x, enemy.y, angle + offset, overloaded ? 315 : 285, damage * (overloaded ? 0.58 : 0.68));
      });
    });
  }

  private showInterceptorDashTelegraph(enemy: Enemy, angle: number): void {
    const color = this.stage.visualTheme.phase3;
    const line = this.add.rectangle(enemy.x, enemy.y, 330, 18, color, 0.13).setDepth(UI_DEPTH.effects);
    line.setStrokeStyle(2, color, 0.48);
    line.rotation = angle;
    const core = this.add.circle(enemy.x, enemy.y, 18, color, 0.18).setStrokeStyle(2, this.stage.visualTheme.foreground, 0.42).setDepth(UI_DEPTH.effects);
    this.tweens.add({ targets: line, alpha: 0, duration: 360, ease: 'Sine.Out', onComplete: () => line.destroy() });
    this.tweens.add({ targets: core, scale: 1.8, alpha: 0, duration: 360, ease: 'Sine.Out', onComplete: () => core.destroy() });
  }

  private updateEnergyNodes(time: number): void {
    const config = this.stage.energyNode;
    if (!config.enabled || this.bossDefeated) {
      return;
    }

    if (!this.bossSpawned && this.elapsedSeconds >= config.startSeconds) {
      if (this.nextEnergyNodeAt === 0) {
        this.nextEnergyNodeAt = time + 700;
      }
      if (time >= this.nextEnergyNodeAt) {
        const interval = this.elapsedSeconds >= config.lateStartSeconds ? config.lateIntervalMs : config.baseIntervalMs;
        this.nextEnergyNodeAt = time + interval;
        this.spawnEnergyNode();
      }
    }

    this.getActiveEnergyNodes().forEach((node) => {
      if (time >= node.dataModel.nextAttackAt) {
        node.dataModel.nextAttackAt = time + 3900;
        this.startEnergyNodePulse(node, time);
      }
    });
  }

  private startEnergyNodePulse(node: Enemy, time: number): void {
    const config = this.stage.energyNode;
    const color = this.stage.visualTheme.hazard;
    const ring = this.add.circle(node.x, node.y, 48, color, 0.08).setStrokeStyle(4, color, 0.62).setDepth(UI_DEPTH.effects);
    const glow = this.add.image(node.x, node.y, 'energy-node-glow').setTint(color).setAlpha(0.32).setDepth(UI_DEPTH.effects - 1);
    this.tweens.add({
      targets: [ring, glow],
      scale: 2.25,
      alpha: 0,
      duration: config.telegraphMs,
      ease: 'Sine.Out',
      onComplete: () => {
        ring.destroy();
        glow.destroy();
      },
    });
    this.time.delayedCall(config.telegraphMs, () => {
      if (!node.active || this.mode !== 'playing') {
        return;
      }
      const offset = time / 700;
      for (let i = 0; i < config.pulseProjectileCount; i += 1) {
        const angle = offset + (Math.PI * 2 * i) / config.pulseProjectileCount;
        this.fireEnemyProjectile(node.x, node.y, angle, config.projectileSpeed, config.projectileDamage, 'energy-node');
      }
      this.createBurst(node.x, node.y, color, 6, 'gold-spark');
    });
  }

  private getEnergyNodeCap(): number {
    const config = this.stage.energyNode;
    if (!config.enabled || this.bossDefeated) {
      return 0;
    }
    if (this.bossSpawned) {
      return 1;
    }
    return this.elapsedSeconds >= config.lateStartSeconds ? config.maxActiveLate : config.maxActiveEarly;
  }

  private getActiveEnergyNodes(): Enemy[] {
    return this.enemies.getChildren().filter((gameObject): gameObject is Enemy => {
      return gameObject instanceof Enemy && gameObject.active && gameObject.dataModel.type === ENERGY_NODE_TYPE;
    });
  }

  private countActiveEnergyNodes(): number {
    return this.getActiveEnergyNodes().length;
  }

  private findNearestEnergyNode(origin: { x: number; y: number }): Enemy | null {
    let closest: Enemy | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    this.getActiveEnergyNodes().forEach((node) => {
      const distance = Phaser.Math.Distance.Squared(origin.x, origin.y, node.x, node.y);
      if (distance < closestDistance) {
        closest = node;
        closestDistance = distance;
      }
    });
    return closest;
  }

  private isEnergyNodeProtected(node: Enemy): boolean {
    return this.enemies.getChildren().some((gameObject) => {
      const guardian = gameObject as Enemy;
      return guardian.active
        && guardian.dataModel.type === 'guardian'
        && Phaser.Math.Distance.Squared(guardian.x, guardian.y, node.x, node.y) <= GUARDIAN_LINK_RANGE * GUARDIAN_LINK_RANGE;
    });
  }

  private drawGuardianLinks(): void {
    const nodes = this.getActiveEnergyNodes();
    if (nodes.length === 0) {
      return;
    }

    this.enemies.getChildren().forEach((gameObject) => {
      const guardian = gameObject as Enemy;
      if (!guardian.active || guardian.dataModel.type !== 'guardian') {
        return;
      }
      const node = this.findNearestEnergyNode(guardian);
      if (!node || Phaser.Math.Distance.Squared(guardian.x, guardian.y, node.x, node.y) > GUARDIAN_LINK_RANGE * GUARDIAN_LINK_RANGE) {
        return;
      }
      this.foregroundFx.lineStyle(3, this.stage.visualTheme.phase3, 0.32);
      this.foregroundFx.lineBetween(guardian.x, guardian.y, node.x, node.y);
      this.foregroundFx.fillStyle(this.stage.visualTheme.phase3, 0.16);
      this.foregroundFx.fillCircle(node.x, node.y, 34 + Math.sin(this.time.now / 160) * 3);
    });
  }

  private pickEnergyNodePoint(): Phaser.Math.Vector2 {
    const camera = this.cameras.main;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(260, 620);
      const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, camera.scrollX + 110, camera.scrollX + camera.width - 110);
      const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, camera.scrollY + 110, camera.scrollY + camera.height - 110);
      if (Phaser.Math.Distance.Squared(x, y, this.player.x, this.player.y) >= 210 * 210) {
        return new Phaser.Math.Vector2(Phaser.Math.Clamp(x, 90, WORLD.width - 90), Phaser.Math.Clamp(y, 90, WORLD.height - 90));
      }
    }
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(this.player.x + 300, 90, WORLD.width - 90),
      Phaser.Math.Clamp(this.player.y - 120, 90, WORLD.height - 90),
    );
  }

  private createEnergyNodeArrival(x: number, y: number): void {
    const color = this.stage.visualTheme.hazard;
    const glow = this.add.image(x, y, 'energy-node-glow').setTint(color).setAlpha(0.24).setDepth(UI_DEPTH.effects - 1);
    this.tweens.add({ targets: glow, scale: 1.8, alpha: 0, duration: 420, ease: 'Sine.Out', onComplete: () => glow.destroy() });
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
    const damageScale = calculateProjectileVolleyDamageScale(count);
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * Phaser.Math.DegToRad(this.stats.projectileSpread);
      this.firePlayerProjectile(baseAngle + offset, damageScale);
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

  private firePlayerProjectile(angle: number, damageScale: number): void {
    const projectile = this.getProjectile(this.playerProjectiles, 'player');
    const critical = Math.random() < this.stats.criticalChance;
    const damage = this.stats.damage * damageScale * (critical ? this.stats.criticalDamage : 1);
    projectile.fire(this.player.x, this.player.y, angle, this.stats.projectileSpeed, {
      owner: 'player',
      damage,
      critical,
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

  private fireEnemyProjectile(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    source: 'enemy' | 'boss' | 'energy-node' = 'enemy',
  ): void {
    const projectile = this.getProjectile(this.enemyProjectiles, 'enemy');
    projectile.fire(x, y, angle, speed, {
      owner: 'enemy',
      source,
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
    this.damageEnemy(enemy, data.damage, data.knockback, true, 0, Boolean(data.critical));
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
    if (projectile.projectileData.source === 'energy-node') {
      this.energyNodePressureHits += 1;
      playtestTelemetry.recordEnergyNodePressureHit(this.elapsedSeconds);
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
    const protectedByGuardian = data.type === ENERGY_NODE_TYPE && this.isEnergyNodeProtected(enemy);
    const finalAmount = protectedByGuardian ? amount * GUARDIAN_PROTECTION_MULTIPLIER : amount;
    data.health -= finalAmount;
    this.showDamage(enemy.x, enemy.y, Math.floor(finalAmount), critical ? cssColor(COLORS.critical) : data.elite ? '#fff5a8' : '#ffffff', critical);
    if (protectedByGuardian) {
      this.createGuardianShieldPulse(enemy.x, enemy.y);
    }
    this.createHitImpact(enemy, critical);
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
      this.stats.currentHealth = Math.min(this.stats.maxHealth, this.stats.currentHealth + finalAmount * this.stats.lifesteal);
      this.createLifestealReturn(enemy.x, enemy.y);
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
      this.analytics.track('elite_killed', { time: this.elapsedSeconds });
      playtestTelemetry.recordEliteKilled(this.elapsedSeconds);
    }
    if (data.type === ENERGY_NODE_TYPE) {
      this.energyNodesDestroyed += 1;
      playtestTelemetry.recordEnergyNodeDestroyed(this.elapsedSeconds);
    }
    if (data.behavior === 'boss') {
      this.bossDefeated = true;
      this.analytics.track('boss_defeated');
      playtestTelemetry.recordBossDefeated(this.elapsedSeconds);
    }
    this.dropXp(deathX, deathY, data.xp);
    this.createDeathBurst(deathX, deathY, data.type, data.elite);
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

    if (data.behavior === 'boss') {
      this.cameras.main.shake(360, 0.012);
      const theme = this.stage.visualTheme;
      const pulse = this.add.circle(deathX, deathY, 90, theme.boss, 0.28).setDepth(UI_DEPTH.effects);
      pulse.setStrokeStyle(4, 0xffffff, 0.72);
      this.tweens.add({ targets: pulse, scale: 2.1, alpha: 0, duration: 520, ease: 'Sine.Out', onComplete: () => pulse.destroy() });
      const overload = this.add.circle(deathX, deathY, 48, theme.bossDanger, 0.18).setDepth(UI_DEPTH.effects);
      overload.setStrokeStyle(5, theme.bossDanger, 0.5);
      this.tweens.add({ targets: overload, scale: 4.6, alpha: 0, duration: 760, ease: 'Sine.Out', onComplete: () => overload.destroy() });
      this.createBurst(deathX, deathY, theme.boss, 18, 'gold-spark');
      this.createBurst(deathX, deathY, theme.bossDanger, 12, 'danger-spark');
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
    this.damageTaken += damage;
    playtestTelemetry.recordDamageTaken(damage);
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
      if (playtestTelemetry.recordFirstLevelUp(this.elapsedSeconds)) {
        this.analytics.track('first_level_up', { time: this.elapsedSeconds });
      }
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
    this.currentOfferedUpgradeIds = options.map((option) => option.id);
    playtestTelemetry.recordUpgradeOffer(this.currentOfferedUpgradeIds, this.elapsedSeconds);
    this.analytics.track('upgrade_offered', { ids: this.currentOfferedUpgradeIds.join(','), time: this.elapsedSeconds });
    this.pendingUpgradeChoices -= 1;
    this.mode = 'level-up';
    this.physics.world.pause();
    this.player.setVelocity(0, 0);
    this.audio.play('levelUp');
    this.showLevelUpFlash();
    this.upgradeUi = new UpgradeUI(this, options, this.upgrades, (upgrade) => this.selectUpgrade(upgrade));
  }

  private selectUpgrade(upgrade: UpgradeDefinition): void {
    const levelBefore = this.upgrades[upgrade.id] ?? 0;
    this.upgrades = applyUpgrade(this.stats, this.upgrades, upgrade);
    this.player.updateEvolutionVisuals(this.upgrades);
    this.showPlayerEvolutionPulse(upgrade.id);
    const levelAfter = this.upgrades[upgrade.id] ?? 0;
    this.analytics.track('upgrade_selected', { id: upgrade.id, level: levelAfter });
    playtestTelemetry.recordUpgradeSelected(
      upgrade.id,
      levelBefore,
      levelAfter,
      this.elapsedSeconds,
      this.currentOfferedUpgradeIds,
    );
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

  private updateStageHazards(time: number): void {
    const hazardConfig = this.stage.hazard;
    if (!hazardConfig.enabled || this.elapsedSeconds < hazardConfig.startSeconds || this.bossDefeated) {
      return;
    }

    if (this.nextStageHazardAt === 0) {
      this.nextStageHazardAt = time + hazardConfig.baseIntervalMs;
    }

    if (time >= this.nextStageHazardAt && this.stageHazards.length < 3) {
      const interval = this.elapsedSeconds >= 65 ? hazardConfig.lateIntervalMs : hazardConfig.baseIntervalMs;
      this.nextStageHazardAt = time + interval;
      this.spawnStageHazard(time);
    }

    this.stageHazards = this.stageHazards.filter((hazard) => {
      const active = time >= hazard.activeAt;
      if (active && !hazard.damageApplied) {
        hazard.zone.setFillStyle(this.stage.visualTheme.hazard, 0.18);
        hazard.core.setAlpha(0.5);
        if (Phaser.Math.Distance.Squared(hazard.x, hazard.y, this.player.x, this.player.y) <= hazard.radius * hazard.radius) {
          hazard.damageApplied = true;
          this.damagePlayer(hazardConfig.damage);
          this.createBurst(this.player.x, this.player.y, this.stage.visualTheme.hazard, 5, 'danger-spark');
        }
      }
      if (time >= hazard.expiresAt) {
        hazard.zone.destroy();
        hazard.core.destroy();
        return false;
      }
      return true;
    });
  }

  private spawnStageHazard(time: number): void {
    const config = this.stage.hazard;
    const point = this.pickHazardPoint();
    const zone = this.add.circle(point.x, point.y, config.radius, this.stage.visualTheme.hazard, 0.06);
    zone.setStrokeStyle(3, this.stage.visualTheme.hazard, 0.58).setDepth(UI_DEPTH.effects - 1);
    const core = this.add.circle(point.x, point.y, Math.max(22, config.radius * 0.18), this.stage.visualTheme.bossDanger, 0.22);
    core.setStrokeStyle(2, 0xffffff, 0.4).setDepth(UI_DEPTH.effects);
    this.tweens.add({
      targets: zone,
      scale: { from: 0.18, to: 1 },
      alpha: { from: 0.9, to: 0.72 },
      duration: config.telegraphMs,
      ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: core,
      scale: 2.8,
      alpha: 0,
      duration: config.telegraphMs + config.activeMs,
      ease: 'Sine.Out',
      onComplete: () => core.destroy(),
    });
    this.stageHazards.push({
      zone,
      core,
      x: point.x,
      y: point.y,
      radius: config.radius,
      activeAt: time + config.telegraphMs,
      expiresAt: time + config.telegraphMs + config.activeMs,
      damageApplied: false,
    });
  }

  private pickHazardPoint(): Phaser.Math.Vector2 {
    const camera = this.cameras.main;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(180, 520);
      const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, camera.scrollX + 90, camera.scrollX + camera.width - 90);
      const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, camera.scrollY + 90, camera.scrollY + camera.height - 90);
      if (Phaser.Math.Distance.Squared(x, y, this.player.x, this.player.y) >= 160 * 160) {
        return new Phaser.Math.Vector2(Phaser.Math.Clamp(x, 80, WORLD.width - 80), Phaser.Math.Clamp(y, 80, WORLD.height - 80));
      }
    }
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(this.player.x + 220, 80, WORLD.width - 80),
      Phaser.Math.Clamp(this.player.y, 80, WORLD.height - 80),
    );
  }

  private spawnBoss(_time: number): void {
    this.bossSpawned = true;
    this.clearArenaForBossEntrance();
    this.showBossWarning();
    this.createBossEntranceShockwave();
    this.cameras.main.flash(180, 255, 238, 88, false);
    this.time.delayedCall(940, () => this.createBossEntity(this.time.now));
    this.cameras.main.shake(260, 0.006);
    this.audio.play('bossSpawn');
    this.analytics.track('boss_reached');
    playtestTelemetry.recordBossReached(this.elapsedSeconds);
  }

  private createBossEntity(time: number): void {
    if (this.mode !== 'playing' || this.bossDefeated || this.boss?.active) {
      return;
    }
    const spawn = this.pickBossEntrancePoint();
    const baseDefinition = ENEMY_DEFINITIONS[this.stage.boss.type];
    const bossDefinition: EnemyDefinition = {
      ...baseDefinition,
      name: this.stage.boss.name,
      health: baseDefinition.health * this.stage.boss.healthMultiplier,
      speed: baseDefinition.speed * this.stage.boss.speedMultiplier,
    };
    this.boss = new Enemy(this, spawn.x, spawn.y, bossDefinition, false, 1);
    this.enemies.add(this.boss);
    this.boss.setAlpha(0.15).setScale(0.82);
    this.tweens.add({ targets: this.boss, alpha: 1, scale: 1, duration: 260, ease: 'Back.Out' });
    this.createSpawnFlash(this.boss.x, this.boss.y, this.stage.visualTheme.boss, 92);
    this.createBossMaterialization(this.boss.x, this.boss.y);
    this.bossBar.show();
    this.nextBossChargeAt = time + 2500;
    this.nextBossRadialAt = time + 4200;
    this.nextBossSupportNodeAt = time + 5200;
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
    const hpBefore = this.stats.currentHealth;
    this.stats.currentHealth = Math.min(this.stats.maxHealth, this.stats.currentHealth + this.stage.boss.entryHeal);
    playtestTelemetry.recordBossEntryRecovery({
      hpBefore,
      hpAfter: this.stats.currentHealth,
      maxHp: this.stats.maxHealth,
    });
    this.enemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Enemy;
      if (enemy.active && enemy.dataModel.behavior !== 'boss') {
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

  private createBossEntranceShockwave(): void {
    const theme = this.stage.visualTheme;
    const camera = this.cameras.main;
    const x = camera.scrollX + camera.width / 2;
    const y = camera.scrollY + camera.height / 2;
    const ring = this.add.circle(x, y, Math.min(camera.width, camera.height) * 0.2, theme.boss, 0.08).setDepth(UI_DEPTH.effects - 2);
    ring.setStrokeStyle(5, theme.boss, 0.42);
    this.tweens.add({
      targets: ring,
      scale: 5.4,
      alpha: 0,
      duration: 880,
      ease: 'Sine.Out',
      onComplete: () => ring.destroy(),
    });
  }

  private createBossMaterialization(x: number, y: number): void {
    const theme = this.stage.visualTheme;
    for (let index = 0; index < 3; index += 1) {
      const ring = this.add.circle(x, y, 48 + index * 28, theme.boss, 0.06).setDepth(UI_DEPTH.effects);
      ring.setStrokeStyle(3, index === 1 ? theme.bossDanger : theme.boss, 0.34 - index * 0.06);
      this.tweens.add({
        targets: ring,
        scale: 1.9 + index * 0.48,
        alpha: 0,
        delay: index * 70,
        duration: 520 + index * 110,
        ease: 'Sine.Out',
        onComplete: () => ring.destroy(),
      });
    }
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

    if (data.type === 'forge-boss' && time >= this.nextBossSupportNodeAt) {
      this.nextBossSupportNodeAt = time + 9400;
      const offset = new Phaser.Math.Vector2(-direction.y, direction.x).scale(210);
      this.spawnEnergyNode(new Phaser.Math.Vector2(
        Phaser.Math.Clamp(this.boss.x + offset.x, 110, WORLD.width - 110),
        Phaser.Math.Clamp(this.boss.y + offset.y, 110, WORLD.height - 110),
      ));
    }
    if (data.type === 'grid-boss' && time >= this.nextBossSupportNodeAt) {
      this.nextBossSupportNodeAt = time + 8200;
      this.forceArenaOverload(time, 1050, 3000, 1600);
      this.fireGridBossLane(direction.angle());
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
      const bossContactDamage = data.chargeUntil > time ? data.damage * BOSS_BALANCE.chargeDamageMultiplier : data.damage;
      this.damagePlayer(bossContactDamage);
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
    const theme = this.stage.visualTheme;
    const line = this.add.rectangle(this.boss.x, this.boss.y, 460, 44, theme.bossDanger, 0.22).setDepth(UI_DEPTH.effects);
    line.setStrokeStyle(2, theme.bossDanger, 0.5);
    line.rotation = direction.angle();
    this.bossTelegraph = line;
    this.tweens.add({ targets: line, alpha: 0, duration: 620, onComplete: () => line.destroy() });
    const core = this.add.circle(this.boss.x, this.boss.y, 46, theme.bossDanger, 0.16).setDepth(UI_DEPTH.effects);
    core.setStrokeStyle(3, theme.boss, 0.45);
    this.tweens.add({ targets: core, scale: 1.55, alpha: 0, duration: 620, ease: 'Sine.Out', onComplete: () => core.destroy() });
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
    const theme = this.stage.visualTheme;
    const ring = this.add.circle(this.boss.x, this.boss.y, 72, theme.boss, 0.12).setStrokeStyle(5, theme.boss, 0.7);
    ring.setDepth(UI_DEPTH.effects);
    this.bossRadialRing = ring;
    const warning = this.add.circle(this.boss.x, this.boss.y, 38, theme.bossDanger, 0.1).setStrokeStyle(3, theme.bossDanger, 0.42);
    warning.setDepth(UI_DEPTH.effects);
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
    this.tweens.add({
      targets: warning,
      scale: 3,
      alpha: 0,
      duration: 680,
      onUpdate: () => {
        if (this.boss?.active) {
          warning.setPosition(this.boss.x, this.boss.y);
        }
      },
      onComplete: () => warning.destroy(),
    });
  }

  private fireBossRadial(): void {
    if (!this.boss) {
      return;
    }
    const riftBoss = this.boss.dataModel.type === 'rift-boss';
    const forgeBoss = this.boss.dataModel.type === 'forge-boss';
    const gridBoss = this.boss.dataModel.type === 'grid-boss';
    const projectileCount = riftBoss ? 14 : gridBoss ? 8 : forgeBoss ? 10 : 12;
    const offset = riftBoss ? this.time.now / 800 : gridBoss ? this.time.now / 1100 : forgeBoss ? Math.PI / 10 : 0;
    for (let i = 0; i < projectileCount; i += 1) {
      const angle = offset + (Math.PI * 2 * i) / projectileCount;
      this.fireEnemyProjectile(
        this.boss.x,
        this.boss.y,
        angle,
        riftBoss ? 270 : gridBoss ? 285 : forgeBoss ? 250 : 245,
        this.boss.dataModel.damage * (riftBoss ? 0.64 : gridBoss ? 0.6 : forgeBoss ? 0.66 : 0.72),
        'boss',
      );
    }
    if (riftBoss && this.stage.hazard.enabled) {
      this.spawnStageHazard(this.time.now);
    }
    if (gridBoss) {
      this.forceArenaOverload(this.time.now, 1000, 2600, 1500);
    }
  }

  private fireGridBossLane(angle: number): void {
    if (!this.boss?.active) {
      return;
    }
    const color = this.stage.visualTheme.bossDanger;
    const lanes = [-0.2, 0.2].map((offset) => {
      const lane = this.add.rectangle(this.boss?.x ?? 0, this.boss?.y ?? 0, 560, 26, color, 0.14).setDepth(UI_DEPTH.effects);
      lane.setStrokeStyle(2, color, 0.45);
      lane.rotation = angle + offset;
      return lane;
    });
    this.tweens.add({
      targets: lanes,
      alpha: 0,
      duration: 520,
      ease: 'Sine.Out',
      onComplete: () => lanes.forEach((lane) => lane.destroy()),
    });
    this.time.delayedCall(410, () => {
      if (!this.boss?.active || this.mode !== 'playing') {
        return;
      }
      [-0.2, 0.2].forEach((offset) => {
        this.fireEnemyProjectile(this.boss?.x ?? 0, this.boss?.y ?? 0, angle + offset, 360, this.boss?.dataModel.damage ?? 12, 'boss');
      });
    });
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

  private createHitImpact(enemy: Enemy, critical: boolean): void {
    const data = enemy.dataModel;
    const major = critical || data.elite || data.behavior === 'boss';
    if (!major && Math.random() > 0.38) {
      return;
    }
    const color = critical ? COLORS.critical : this.getEnemyVisualColor(data.type, data.elite);
    const flash = this.add.circle(enemy.x, enemy.y, major ? 16 : 10, color, major ? 0.2 : 0.12).setDepth(UI_DEPTH.effects);
    flash.setStrokeStyle(major ? 2 : 1, color, major ? 0.38 : 0.22);
    this.tweens.add({
      targets: flash,
      scale: major ? 1.75 : 1.35,
      alpha: 0,
      duration: major ? 180 : 120,
      onComplete: () => flash.destroy(),
    });
  }

  private createDeathBurst(x: number, y: number, type: EnemyType, elite: boolean): void {
    const color = this.getEnemyVisualColor(type, elite);
    const count = elite ? 12 : type === 'tank' ? 10 : type === 'swarm' ? 5 : 7;
    const texture = elite ? 'gold-spark' : type === 'runner' || type === 'ranged' ? 'danger-spark' : 'spark';
    const ring = this.add.circle(x, y, elite ? 32 : 22, color, elite ? 0.14 : 0.08).setDepth(UI_DEPTH.effects);
    ring.setStrokeStyle(elite ? 3 : 2, color, elite ? 0.42 : 0.28);
    this.tweens.add({ targets: ring, scale: elite ? 2.2 : 1.7, alpha: 0, duration: elite ? 330 : 240, onComplete: () => ring.destroy() });
    this.createBurst(x, y, color, count, texture);
  }

  private getEnemyVisualColor(type: EnemyType, elite: boolean): number {
    if (elite) {
      return COLORS.elite;
    }
    if (type === 'boss') {
      return this.stage.visualTheme.boss;
    }
    if (type === 'rift-boss') {
      return this.stage.visualTheme.boss;
    }
    return ENEMY_DEFINITIONS[type].tint;
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

  private createGuardianShieldPulse(x: number, y: number): void {
    const color = this.stage.visualTheme.phase3;
    const ring = this.add.circle(x, y, 34, color, 0.08).setStrokeStyle(3, color, 0.48).setDepth(UI_DEPTH.effects);
    this.tweens.add({ targets: ring, scale: 1.7, alpha: 0, duration: 220, ease: 'Sine.Out', onComplete: () => ring.destroy() });
  }

  private createPickupBurst(x: number, y: number): void {
    const flash = this.add.circle(x, y, 14, COLORS.xp, 0.18).setDepth(UI_DEPTH.effects);
    this.tweens.add({ targets: flash, scale: 1.9, alpha: 0, duration: 220, onComplete: () => flash.destroy() });
  }

  private createLifestealReturn(x: number, y: number): void {
    if (Math.random() > 0.55) {
      return;
    }
    const spark = this.add.image(x, y, 'danger-spark').setTint(COLORS.playerLifesteal).setDepth(UI_DEPTH.effects).setAlpha(0.42).setScale(0.72);
    this.tweens.add({
      targets: spark,
      x: this.player.x,
      y: this.player.y,
      alpha: 0,
      scale: 0.22,
      duration: 260,
      ease: 'Sine.In',
      onComplete: () => spark.destroy(),
    });
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

  private showPlayerEvolutionPulse(upgradeId: string): void {
    const color = upgradeId === 'armor'
      ? COLORS.playerShield
      : upgradeId === 'magnet'
        ? COLORS.playerMagnet
        : upgradeId === 'lifesteal'
          ? COLORS.playerLifesteal
          : upgradeId.includes('critical') || upgradeId.includes('explosion') || upgradeId.includes('chain')
            ? COLORS.critical
            : COLORS.playerProjectileCore;
    const ring = this.add.circle(this.player.x, this.player.y, 38, color, 0.1).setDepth(UI_DEPTH.effects);
    ring.setStrokeStyle(3, color, 0.46);
    this.tweens.add({
      targets: ring,
      scale: 2.4,
      alpha: 0,
      duration: 420,
      ease: 'Sine.Out',
      onComplete: () => ring.destroy(),
    });
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
    const theme = this.stage.visualTheme;
    const banner = this.add.rectangle(this.scale.width / 2, y, width, shortLandscape ? 38 : 48, theme.bossDanger, 0.2);
    banner.setStrokeStyle(2, theme.boss, 0.5);
    const text = this.add
      .text(this.scale.width / 2, y, 'BOSS INCOMING', {
        color: cssColor(this.stage.visualTheme.foreground),
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

  private updateTelemetryProgress(time: number): void {
    if (time < this.nextTelemetryProgressAt) {
      return;
    }
    this.nextTelemetryProgressAt = time + 1000;
    const liveScore = this.score + calculateScoreBonus(this.elapsedSeconds, this.kills, this.eliteKills);
    playtestTelemetry.recordRunProgress({
      durationSeconds: this.elapsedSeconds,
      score: liveScore,
      coinsEarned: calculateCoins(liveScore, this.kills, false, false),
      playerLevel: this.level,
      kills: this.kills,
      eliteKills: this.eliteKills,
      remainingHp: Math.max(0, this.stats.currentHealth),
      maxHp: this.stats.maxHealth,
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
    const finalScore = this.score + calculateScoreBonus(this.elapsedSeconds, this.kills, this.eliteKills) + (victory ? this.stage.boss.scoreBonus : 0);
    const result: RunResult = {
      stageId: this.stage.id,
      chapterId: this.stage.chapterId,
      victory,
      score: finalScore,
      kills: this.kills,
      eliteKills: this.eliteKills,
      bossDefeated: this.bossDefeated,
      survivalSeconds: this.elapsedSeconds,
      coinsEarned: calculateCoins(finalScore, this.kills, victory, this.bossDefeated),
      playerLevel: this.level,
      damageTaken: this.damageTaken,
      energyNodesDestroyed: this.energyNodesDestroyed,
      energyNodePressureHits: this.energyNodePressureHits,
      arenaShifts: this.arenaShifts,
      overloadEvents: this.overloadEvents,
      overloadHits: this.overloadHits,
    };
    const chapter = getChapterForStage(this.stage.id);
    const clearedStageIds = new Set([...this.save.clearedStageIds, this.stage.id]);
    const chapterCompleted = chapter.completeWhenAllStagesCleared
      && chapter.stageIds.every((stageId) => clearedStageIds.has(stageId))
      && !this.save.clearedChapterIds.includes(chapter.id);
    if (victory && chapterCompleted) {
      playtestTelemetry.recordChapterCompleted(this.stage.chapterId, this.elapsedSeconds);
    }
    playtestTelemetry.completeRun({
      result,
      durationSeconds: this.elapsedSeconds,
      remainingHp: Math.max(0, this.stats.currentHealth),
      maxHp: this.stats.maxHealth,
    });
    this.analytics.track('run_completed', { victory, score: finalScore, duration: this.elapsedSeconds });
    this.time.delayedCall(650, () => {
      this.physics.world.resume();
      this.scene.start('ResultScene', { save: this.save, result });
    });
  }
}
