
export const SITE = {
  
  origin: import.meta.env.VITE_SITE_ORIGIN ?? "https://tsumugu.cc",
  
  dictOrigin: import.meta.env.VITE_DICT_ORIGIN ?? "https://tsumugu-ed.com",
  name: "Tsumugu Beta",
} as const;
