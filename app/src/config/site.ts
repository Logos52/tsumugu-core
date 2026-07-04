/** Site-wide origin and branding — single source for canonical URLs, sitemap, manifest. */
export const SITE = {
  /** Core SPA origin (canonical URLs, sitemap, manifest). */
  origin: import.meta.env.VITE_SITE_ORIGIN ?? "https://tsumugu.cc",
  /**
   * Published tsumugu-ed (dictionary) origin. Env-driven so deep-links resolve
   * against the LIVE dictionary today; at federation cutover the deploy env flips
   * this to the same origin as {@link SITE.origin} (`https://tsumugu.cc`) and the
   * routing Worker forwards `/c|/w|/g|/browse|/dict-assets` to the ed Pages build.
   */
  dictOrigin: import.meta.env.VITE_DICT_ORIGIN ?? "https://tsumugu-ed.com",
  name: "Tsumugu Beta",
} as const;
