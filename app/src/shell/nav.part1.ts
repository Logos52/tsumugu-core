import type { ReaderSettings } from "../app/settings.js";

import { applySettingsToRoot } from "../app/settings.js";

function syncRailToSettings(rail: "en" | "vi", onPatch: (p: Partial<ReaderSettings>) => void): void {
  const patch: Partial<ReaderSettings> = {
    rail,
    ...(rail === "vi" ? { reading: "hv", gloss: "vi" } : { reading: "py", gloss: "en" }),
  };
  onPatch(patch);
  applySettingsToRoot({
    ...({ rail: "en", script: "trad", reading: "py", gloss: "en", theme: "light", palette: "seal", knownStateOn: false } as ReaderSettings),
    ...patch,
  });
}
