import { BrowserAudioService } from './AudioService';
import { PlayablesLifecycleCoordinator } from './PlayablesLifecycleCoordinator';
import { PlaytestTelemetryService } from './PlaytestTelemetryService';
import { saveLatestSnapshotBestEffort } from './PersistenceCoordinator';
import { createGameStorage } from './StorageService';
import { youtubePlayables } from './YouTubePlayablesService';
import { isPlaytestModeEnabled } from '../config/playtest';

export const platform = youtubePlayables;
export const gameStorage = createGameStorage(platform);
export const gameAudio = new BrowserAudioService();
export const playtestTelemetry = new PlaytestTelemetryService({ enabled: isPlaytestModeEnabled() });
export const playablesLifecycle = new PlayablesLifecycleCoordinator({
  platform,
  audio: gameAudio,
  saveOnPause: () => saveLatestSnapshotBestEffort(gameStorage, platform),
});
