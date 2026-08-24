export function isPlaytestModeEnabled(): boolean {
  return import.meta.env.VITE_PLAYTEST_MODE === 'true';
}
