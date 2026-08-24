export type AnalyticsEventName =
  | 'game_started'
  | 'game_over'
  | 'victory'
  | 'boss_reached'
  | 'boss_defeated'
  | 'upgrade_selected'
  | 'run_duration'
  | 'player_level';

export interface AnalyticsPayload {
  [key: string]: string | number | boolean;
}

export interface AnalyticsService {
  track(name: AnalyticsEventName, payload?: AnalyticsPayload): void;
}

export class MemoryAnalyticsService implements AnalyticsService {
  readonly events: Array<{ name: AnalyticsEventName; payload: AnalyticsPayload }> = [];

  track(name: AnalyticsEventName, payload: AnalyticsPayload = {}): void {
    this.events.push({ name, payload });
  }
}
