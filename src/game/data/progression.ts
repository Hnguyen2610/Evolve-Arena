import type { GameSaveData } from '../types';
import { SAVE_VERSION } from '../config/constants';
import { DEFAULT_STAGE_ID } from './stages';

export const DEFAULT_SAVE_DATA: GameSaveData = {
  version: SAVE_VERSION,
  bestScore: 0,
  coins: 0,
  permanentUpgrades: {
    damage: 0,
    health: 0,
    speed: 0,
  },
  unlockedStageIds: [DEFAULT_STAGE_ID],
  clearedStageIds: [],
  clearedChapterIds: [],
  stageMastery: {},
  stageRecords: {},
};
