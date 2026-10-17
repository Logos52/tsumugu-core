

function envOn(key: string): boolean {
  try {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return v === "true" || v === "1";
  } catch {
    return false;
  }
}

export const FEATURES = {
  
  accounts: envOn("VITE_FEATURE_ACCOUNTS"),
  
  sync: envOn("VITE_FEATURE_SYNC"),
  
  voice: envOn("VITE_FEATURE_VOICE"),
  
  
  
  
  encodingModal: envOn("VITE_FEATURE_ENCODING_MODAL"),
  
  
  
  
  pro: envOn("VITE_FEATURE_PRO"),
  
  ads: envOn("VITE_FEATURE_ADS"),
  
  donate: envOn("VITE_FEATURE_DONATE"),
} as const;

type FeatureFlag = keyof typeof FEATURES;
