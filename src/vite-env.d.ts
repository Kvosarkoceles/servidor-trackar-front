/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_POSITION_REFRESH?: string;
  readonly VITE_MAP_PROVIDER?: string;
  readonly VITE_OFFLINE_THRESHOLD_SECONDS?: string;
  readonly VITE_MOVING_SPEED_KMH?: string;
  readonly VITE_DASHBOARD_MAX_DEVICES?: string;
  readonly VITE_API_CONCURRENCY?: string;
  readonly VITE_HTTP_TIMEOUT?: string;
  readonly VITE_DEFAULT_THEME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
