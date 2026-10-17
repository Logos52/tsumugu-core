import {
  loadDefLevelIndex,
  tocflOrdinal,
  type DefLevelIndex,
} from "./defLevelData.js";

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

import { checkDefLevel, type DefLevelViolation } from "./defLevel.js";

import { isCircularZhDef, isEmptyZhDef } from "./zhDefGuards.js";

import type { DefLevelEntryStats } from "./verify.part3.js";

export function resolveDefIndex(lang: string, explicit?: DefLevelIndex): DefLevelIndex | undefined {
  if (explicit !== undefined) return explicit;
  if (lang !== "zh-Hant") return undefined;
  try {
    return loadDefLevelIndex();
  } catch {
    return undefined;
  }
}

export function verifyZhDefs(
  glossary: Record<string, PrebakedEntry>,
  lang: string,
  defIndex: DefLevelIndex | undefined,
): {
  violations: DefLevelViolation[];
  byEntry: Record<string, DefLevelEntryStats>;
  circular: string[];
  empty: string[];
  passRate: number;
  stamped: Record<string, PrebakedEntry>;
} {
  const violations: DefLevelViolation[] = [];
  const byEntry: Record<string, DefLevelEntryStats> = {};
  const circular: string[] = [];
  const empty: string[] = [];
  const stamped: Record<string, PrebakedEntry> = { ...glossary };

  if (defIndex === undefined) {
    return { violations, byEntry, circular, empty, passRate: 1, stamped };
  }

  let checked = 0;
  let passed = 0;

  for (const [key, entry] of Object.entries(glossary)) {
    const zh = entry.definitions?.zh;
    if (zh === undefined) continue;

    const ceiling = zh.level;
    const term = entry.term;
    const circ = isCircularZhDef(term, zh.gloss, zh.illustration);
    const emp = isEmptyZhDef(term, zh.gloss);
    if (circ) circular.push(term);
    if (emp) empty.push(term);
    if (emp) {
      byEntry[key] = {
        term,
        ceiling,
        violationCount: 0,
        circular: circ,
        empty: true,
      };
      continue;
    }

    checked += 1;

    const entryViolations: DefLevelViolation[] = [];

    const glossCheck = checkDefLevel({
      text: zh.gloss,
      ceiling,
      index: defIndex,
      field: "definitions.zh.gloss",
    });
    entryViolations.push(...glossCheck.violations);

    let achievedOrd = tocflOrdinal(glossCheck.achievedLevel);
    if (zh.illustration !== undefined && zh.illustration.trim() !== "") {
      const illCheck = checkDefLevel({
        text: zh.illustration,
        ceiling,
        index: defIndex,
        field: "definitions.zh.illustration",
      });
      entryViolations.push(...illCheck.violations);
      achievedOrd = Math.max(achievedOrd, tocflOrdinal(illCheck.achievedLevel));
    }

    if (entry.examples) {
      for (let i = 0; i < entry.examples.length; i++) {
        const ex = entry.examples[i]!;
        if (ex.text.trim() === "") continue;
        const exCheck = checkDefLevel({
          text: ex.text,
          ceiling,
          index: defIndex,
          field: `examples[${i}].text`,
        });
        const exViolations = exCheck.violations.filter((v) => v.word !== term);
        entryViolations.push(...exViolations);
        achievedOrd = Math.max(achievedOrd, tocflOrdinal(exCheck.achievedLevel));
      }
    }

    if (entry.collocations) {
      for (let i = 0; i < entry.collocations.length; i++) {
        const col = entry.collocations[i]!;
        if (col.phrase.trim() === "") continue;
        const colCheck = checkDefLevel({
          text: col.phrase,
          ceiling,
          index: defIndex,
          field: `collocations[${i}].phrase`,
        });
        entryViolations.push(...colCheck.violations);
        achievedOrd = Math.max(achievedOrd, tocflOrdinal(colCheck.achievedLevel));
      }
    }

    const achievedLevel = `TOCFL-${Math.min(7, Math.max(1, achievedOrd))}`;
    const levelEscalated =
      tocflOrdinal(achievedLevel) > tocflOrdinal(ceiling) || entryViolations.length > 0;

    if (entryViolations.length === 0) passed += 1;
    violations.push(...entryViolations);

    byEntry[key] = {
      term,
      ceiling,
      achievedLevel,
      levelEscalated,
      violationCount: entryViolations.length,
      circular: circ,
      empty: emp,
    };

    stamped[key] = {
      ...entry,
      definitions: {
        ...entry.definitions,
        zh: {
          ...zh,
          achievedLevel,
          levelEscalated,
        },
      },
    };
  }

  const passRate = checked === 0 ? 1 : passed / checked;
  return { violations, byEntry, circular, empty, passRate, stamped };
}
