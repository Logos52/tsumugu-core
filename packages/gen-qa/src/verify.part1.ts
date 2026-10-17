import {
  scoreCI,
  isKnown,
  type LanguagePack,
  type WordStore,
  type PreparedContent,
  type PrebakedEntry,
  type BridgeInfo,
  type BridgeMorpheme,
  type KnownPolicy,
  type MonoDefinition,
} from "@tsumugu/engine";

import { verifyExamples, type ExampleEntryStats } from "./exampleVerify.js";

import {
  assertMonolingualSeedLicenses,
  type ProvenanceManifest,
} from "./licenseAssert.js";

import { hasUsableGlossaryGloss, normalize, normalizeEntry } from "./verify.part3.js";

import type { VerifyOptions, VerifyReport } from "./verify.part3.js";

import { resolveDefIndex, verifyZhDefs } from "./verify.part2.js";

export async function verifyContent(opts: VerifyOptions): Promise<VerifyReport> {
  const { pack, store, content, lang } = opts;
  const ciTarget = opts.ciTarget ?? content.ciTarget ?? 0.95;
  const changes: { before: string; after: string }[] = [];

  const tokens = await Promise.all(
    content.tokens.map(async (t) => ({
      text: await normalize(pack, t.text, changes),
      isWord: t.isWord,
    })),
  );
  const glossary: Record<string, PrebakedEntry> = {};
  for (const [key, entry] of Object.entries(content.glossary)) {
    const nk = await normalize(pack, key, changes);
    glossary[nk] = await normalizeEntry(pack, entry, changes);
  }

  const targetWords = opts.targetWords
    ? await Promise.all(opts.targetWords.map((w) => normalize(pack, w, changes)))
    : undefined;

  const ci = scoreCI({
    lang,
    tokens,
    getStatus: (w) => store.getStatus(lang, w),
    ...(opts.policy ? { policy: opts.policy } : {}),
    target: ciTarget,
    ...(targetWords ? { targetWords } : {}),
  });

  const missing = new Set<string>();
  for (const t of tokens) {
    if (!t.isWord) continue;
    if (isKnown(store.getStatus(lang, t.text), opts.policy)) continue;
    const g = glossary[t.text];
    if (!g || !hasUsableGlossaryGloss(g)) missing.add(t.text);
  }

  const recycle = (ci.targetRecycle ?? []).map((r) => ({
    word: r.word,
    count: r.count,
    ok: r.ok,
  }));

  const defIndex = resolveDefIndex(lang, opts.defLevelIndex);
  const zhDef = verifyZhDefs(glossary, lang, defIndex);
  const exampleReport = await verifyExamples({
    glossary: zhDef.stamped,
    lang,
    pack,
    store,
    ...(defIndex !== undefined ? { defIndex } : {}),
    ...(opts.policy ? { policy: opts.policy } : {}),
  });

  const licenseResult = opts.provenance
    ? assertMonolingualSeedLicenses(opts.provenance)
    : { ok: true, errors: [], notes: [] };

  const normalized: PreparedContent = {
    ...content,
    tokens,
    glossary: zhDef.stamped,
    ciMeasured: ci.coverage,
  };

  return {
    ciMeasured: ci.coverage,
    ciTarget,
    meetsTarget: ci.coverage >= ciTarget,
    openccChanges: changes,
    openccChanged: changes.length > 0,
    missingGlossary: [...missing],
    recycle,
    defLevelViolations: zhDef.violations,
    defLevelByEntry: zhDef.byEntry,
    zhDefCircular: zhDef.circular,
    zhDefEmpty: zhDef.empty,
    licenseErrors: licenseResult.errors,
    defLevelPassRate: zhDef.passRate,
    exampleByEntry: exampleReport.byEntry,
    exampleLevelViolations: exampleReport.exampleLevelViolations,
    exampleOverlayRecycleRatio: exampleReport.overlayRecycleRatio,
    exampleErrors: exampleReport.hasErrors,
    normalized,
  };
}
