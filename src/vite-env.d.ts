/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_AI_PROVIDER: string;
  readonly VITE_CATX_BASE_URL: string;
  readonly VITE_CATX_AGENT_ID: string;
  readonly VITE_CATX_ENV_ID: string;
  readonly VITE_CATX_API_KEY: string;
  readonly VITE_CATX_PROXY: string;
  readonly VITE_OPENAI_BASE_URL: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_OPENAI_MODEL: string;
  readonly VITE_SCAN_TOP_N: string;
  readonly VITE_DIRECTIONS_PER_HOTSPOT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
