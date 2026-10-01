/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OFFLINE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Set at build time from VITE_OFFLINE (see vite.config.ts). */
declare const __AAD_OFFLINE__: boolean
