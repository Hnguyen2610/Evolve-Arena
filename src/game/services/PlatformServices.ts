import { BrowserAudioService } from './AudioService';
import { PlayablesLifecycleCoordinator } from './PlayablesLifecycleCoordinator';
import { saveLatestSnapshotBestEffort } from './PersistenceCoordinator';
import { createGameStorage } from './StorageService';
import { youtubePlayables } from './YouTubePlayablesService';

export const platform = youtubePlayables;
export const gameStorage = createGameStorage(platform);
export const gameAudio = new BrowserAudioService();
export const playablesLifecycle = new PlayablesLifecycleCoordinator({
  platform,
  audio: gameAudio,
  saveOnPause: () => saveLatestSnapshotBestEffort(gameStorage),
});
