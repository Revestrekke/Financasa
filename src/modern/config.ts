export interface FinanCasaConfig {
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_URL?: string;
}

declare global {
  interface Window {
    FINANCASA_CONFIG?: FinanCasaConfig;
  }
}

export function getFinanCasaConfig(): Required<FinanCasaConfig> {
  return {
    SUPABASE_URL: window.FINANCASA_CONFIG?.SUPABASE_URL || 'https://fzozyfzihfltgebmufsp.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: window.FINANCASA_CONFIG?.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_AsxuXAWSH1_6a8KHgqi7sw_7OjYbBC2'
  };
}
