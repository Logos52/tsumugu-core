/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_ORIGIN?: string;
  readonly VITE_BASE?: string;
  readonly VITE_SYNC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}