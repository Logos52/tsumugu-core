import { importVocabJson, importVocabList } from "../../app/src/import/importPanel.js";

if (typeof importVocabJson !== "function" || typeof importVocabList !== "function") {
  throw new Error("vocab import entry missing");
}
