import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePreparedContent, WordStore } from "@tsumugu/engine";
import type { DefLevelIndex } from "../src/genQa.js";
import type { CharViIndex, HanVietIndex } from "../src/hanviet.js";
import { loadLessonTarget, type LessonTarget } from "../src/lessonTarget.js";
import { createFakeZhPack } from "../src/pack.js";

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");

export const FIXTURE_DEF_INDEX: DefLevelIndex = {
  tocfl: {
    今天: { level: "TOCFL-2" },
    天氣: { level: "TOCFL-2" },
    很: { level: "TOCFL-1" },
    好: { level: "TOCFL-1" },
    我: { level: "TOCFL-1" },
    想: { level: "TOCFL-1" },
    去: { level: "TOCFL-1" },
    散步: { level: "TOCFL-3" },
    打算: { level: "TOCFL-2" },
    公園: { level: "TOCFL-2" },
    因為: { level: "TOCFL-2" },
    讓: { level: "TOCFL-2" },
    心情: { level: "TOCFL-2" },
    變: { level: "TOCFL-2" },
    後來: { level: "TOCFL-2" },
    遇到: { level: "TOCFL-2" },
    朋友: { level: "TOCFL-1" },
    我們: { level: "TOCFL-1" },
    一起: { level: "TOCFL-2" },
    聊天: { level: "TOCFL-3" },
    聊: { level: "TOCFL-2" },
    了: { level: "TOCFL-1" },
    久: { level: "TOCFL-2" },
    開心: { level: "TOCFL-2" },
    怪獸: { level: "TOCFL-5" },
    看見: { level: "TOCFL-2" },
    一個: { level: "TOCFL-2" },
    学: { level: "TOCFL-2" },
    學: { level: "TOCFL-2" },
    中文: { level: "TOCFL-2" },
    中: { level: "TOCFL-1" },
    文: { level: "TOCFL-1" },
    上: { level: "TOCFL-1" },
    班: { level: "TOCFL-1" },
    上班: { level: "TOCFL-2" },
    也: { level: "TOCFL-1" },
    跟: { level: "TOCFL-2" },
    散: { level: "TOCFL-3" },
    步: { level: "TOCFL-2" },
    電: { level: "TOCFL-3" },
    腦: { level: "TOCFL-3" },
    工: { level: "TOCFL-2" },
    作: { level: "TOCFL-2" },
    臆: { level: "TOCFL-7" },
  },
  freq: {},
};

export const FIXTURE_HANVIET: HanVietIndex = new Map([
  ["散", { hanViets: ["tán"], pinyinMap: { "*": "tán" } }],
  ["步", { hanViets: ["bộ"], pinyinMap: { "*": "bộ" } }],
  [
    "上",
    {
      hanViets: ["thướng", "thượng"],
      pinyinMap: { shang3: "thướng", shang4: "thượng" },
    },
  ],
  ["班", { hanViets: ["ban"], pinyinMap: { "*": "ban" } }],
  ["電", { hanViets: ["điện"], pinyinMap: { "*": "điện" } }],
  ["腦", { hanViets: ["não"], pinyinMap: { "*": "não" } }],
  ["工", { hanViets: ["công"], pinyinMap: { "*": "công" } }],
  ["作", { hanViets: ["tác"], pinyinMap: { "*": "tác" } }],
  ["中", { hanViets: ["trung"], pinyinMap: { "*": "trung" } }],
  ["文", { hanViets: ["văn"], pinyinMap: { "*": "văn" } }],
  ["怪", { hanViets: ["quái"], pinyinMap: { "*": "quái" } }],
  ["獸", { hanViets: ["thú"], pinyinMap: { "*": "thú" } }],
]);

export const FIXTURE_CHAR_VI: CharViIndex = {
  has: (char) =>
    new Set(["散", "步", "上", "班", "電", "腦", "工", "作", "中", "文", "怪", "獸"]).has(
      char,
    ),
};

export const FAKE_ZH_PACK = createFakeZhPack();

export function loadFixturePair(stem: string) {
  const prepared = parsePreparedContent(
    readFileSync(resolve(FIXTURES_DIR, `${stem}.prepared.json`), "utf8"),
  );
  const target = loadLessonTarget(resolve(FIXTURES_DIR, `${stem}.target.json`));
  return { prepared, target };
}

export function storeWithCumulativeKnown(target: LessonTarget): WordStore {
  const store = new WordStore();
  for (const word of target.cumulativeVocab) {
    store.setStatus("zh-Hant", word, "known");
  }
  return store;
}