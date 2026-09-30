/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_TEST_MODE?: string;
  readonly VITE_BETA_MODE?: string;
  readonly VITE_STRIPE_ENABLED?: string;
  readonly VITE_LEGAL_NAME?: string;
  readonly VITE_LEGAL_FORM?: string;
  readonly VITE_LEGAL_ADDRESS?: string;
  readonly VITE_LEGAL_SIRET?: string;
  readonly VITE_LEGAL_DIRECTOR?: string;
  readonly VITE_LEGAL_EMAIL?: string;
  readonly VITE_DATA_REGION?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_AI_DEMO_MODE?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
