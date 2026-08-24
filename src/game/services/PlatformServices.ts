import { createGameStorage } from './StorageService';
import { youtubePlayables } from './YouTubePlayablesService';

export const platform = youtubePlayables;
export const gameStorage = createGameStorage(platform);
