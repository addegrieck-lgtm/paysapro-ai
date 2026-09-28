/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_TEST_MODE?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_AI_DEMO_MODE?: string;
  readonly VITE_CONTACT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
