// Official YouTube Playables SDK declarations, narrowed to APIs used by this game.
// Source: https://www.youtube.com/playablesportal/static/youtube_ytgame_web_deploy_mpm_files/index.d.ts
declare namespace ytgame {
  const SDK_VERSION: string;
  const IN_PLAYABLES_ENV: boolean;

  const enum SdkErrorType {
    UNKNOWN,
    API_UNAVAILABLE,
    INVALID_PARAMS,
    SIZE_LIMIT_EXCEEDED,
  }

  class SdkError extends Error {
    errorType: SdkErrorType;
  }

  namespace engagement {
    interface Score {
      value: number;
    }

    function sendScore(score: Score): Promise<void>;
  }

  namespace game {
    function firstFrameReady(): void;
    function gameReady(): void;
    function saveData(data: string): Promise<void>;
    function loadData(): Promise<string>;
  }

  namespace health {
    function logError(): void;
    function logWarning(): void;
  }

  namespace system {
    function isAudioEnabled(): boolean;
    function onAudioEnabledChange(callback: (isAudioEnabled: boolean) => void): () => void;
    function onPause(callback: () => void): () => void;
    function onResume(callback: () => void): () => void;
    function getLanguage(): Promise<string>;
  }
}
