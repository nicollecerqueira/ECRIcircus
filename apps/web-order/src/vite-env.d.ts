/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Unidade cujo cardápio é mostrado. */
  readonly VITE_LOCATION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
