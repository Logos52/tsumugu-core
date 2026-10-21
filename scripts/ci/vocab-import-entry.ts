import { importVocabJson as panelJson, importVocabList as panelList } from "../../app/src/import/importPanel.js";
import {
  VocabImportError,
  importVocabJson,
  importVocabList,
  splitLearningList,
  type VocabEntryView,
  type VocabImportStore,
  type VocabStatus,
} from "../../app/src/import/vocabImport.js";

const clock = { now: () => new Date("2026-06-24T00:00:00.000Z") };

function memory(): VocabImportStore {
  const map = new Map<string, VocabEntryView>();
  return {
    all: () => [...map.values()],
    get: (lang, word) => map.get(`${lang}\u0000${word}`),
    setStatus: (lang, word, status: VocabStatus, atClock, prov) => {
      map.set(`${lang}\u0000${word}`, {
        lang,
        word,
        status,
        statusUpdatedAt: prov?.at ?? (atClock ?? clock).now().toISOString(),
      });
    },
  };
}

const json = importVocabJson(
  '{"schema":"tsumugu/word-store@2","entries":[{"word":"山","status":"known"}]}',
  memory(),
  { clock },
);
const list = importVocabList("水", memory(), { clock });
if (json.applied !== 1 || list.applied !== 1) throw new Error("vocab import entry failed");
if (panelJson !== importVocabJson || panelList !== importVocabList) throw new Error("vocab import re-export drifted");
if (splitLearningList("水\n山").join(",") !== "水,山") throw new Error("vocab import list split failed");
if (!(new VocabImportError("missing") instanceof Error)) throw new Error("vocab import error missing");
