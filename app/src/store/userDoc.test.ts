import { describe, expect, it } from "vitest";
import { WordStore } from "@tsumugu/engine";
import { DEFAULT_SETTINGS } from "../app/settings.js";
import {
  USER_DOC_SCHEMA,
  type UserDoc,
  emptyUserDoc,
  mergeUserDocs,
  migrateUserDoc,
  toUserDoc,
} from "./userDoc.js";

describe("mergeUserDocs", () => {
  it("merges conflicting statuses using clock-aware resolve (never demote known)", () => {
    const base = emptyUserDoc("u1", "a@test.com", DEFAULT_SETTINGS);
    const localStore = new WordStore();
    localStore.upsert({
      lang: "zh-Hant",
      word: "朋友",
      status: "known",
      lastSeen: "2026-06-24T10:00:00.000Z",
      statusUpdatedAt: "2026-06-24T10:00:00.000Z",
    });
    const local = toUserDoc(localStore, base, "2026-06-24T10:00:00.000Z");

    const serverStore = new WordStore();
    serverStore.upsert({
      lang: "zh-Hant",
      word: "朋友",
      status: "2",
      lastSeen: "2026-06-24T09:00:00.000Z",
      statusUpdatedAt: "2026-06-24T09:00:00.000Z",
    });
    const server = toUserDoc(serverStore, { ...base, updatedAt: "2026-06-24T11:00:00.000Z" }, "2026-06-24T11:00:00.000Z");

    const { merged, report } = mergeUserDocs(local, server);
    expect(report.hadConflict).toBe(true);
    expect(merged.store.entries.find((e) => e.word === "朋友")?.status).toBe("known");
  });
});

describe("UserDoc portability (C4)", () => {
  it("A → B → regrade both → re-sync: zero demotions, zero lost notes/tags", () => {
    const base = emptyUserDoc("u", "", DEFAULT_SETTINGS);

    // Device A: 朋友 known (with notes + tags), 山 still learning.
    const a = new WordStore();
    a.upsert({
      lang: "zh-Hant",
      word: "朋友",
      status: "known",
      statusUpdatedAt: "2026-06-24T10:00:00.000Z",
      notes: "friend note",
      tags: ["core", "hsk1"],
    });
    a.upsert({ lang: "zh-Hant", word: "山", status: "2", statusUpdatedAt: "2026-06-24T10:00:00.000Z" });
    const docA = toUserDoc(a, base, "2026-06-24T10:00:00.000Z");

    // Device B imports A into an empty local store, then grades 山→known and adds 水.
    const emptyB = emptyUserDoc("u", "", DEFAULT_SETTINGS);
    const { merged: onB } = mergeUserDocs(emptyB, docA, "2026-06-24T11:00:00.000Z");
    const bStore = WordStore.fromDoc(onB.store);
    bStore.setStatus("zh-Hant", "山", "known", undefined, { at: "2026-06-25T09:00:00.000Z" });
    bStore.setStatus("zh-Hant", "水", "4", undefined, { at: "2026-06-25T09:05:00.000Z" });
    const docB = toUserDoc(bStore, onB, "2026-06-25T09:10:00.000Z");

    // Meanwhile A accidentally demotes 朋友 with an OLDER clock — must not win.
    const a2 = WordStore.fromDoc(docA.store);
    a2.setStatus("zh-Hant", "朋友", "2", undefined, { at: "2026-06-23T00:00:00.000Z" });
    const docA2 = toUserDoc(a2, docA, "2026-06-25T10:00:00.000Z");

    // Re-sync B back into A2.
    const { merged: final } = mergeUserDocs(docA2, docB, "2026-06-25T11:00:00.000Z");
    const fs = WordStore.fromDoc(final.store);

    expect(fs.getStatus("zh-Hant", "朋友")).toBe("known"); // never demoted
    expect(fs.getStatus("zh-Hant", "山")).toBe("known"); // B's upgrade preserved
    expect(fs.getStatus("zh-Hant", "水")).toBe("4"); // new word preserved

    const pengyou = fs.get("zh-Hant", "朋友");
    expect(pengyou?.notes).toBe("friend note"); // notes preserved
    expect(pengyou?.tags).toEqual(expect.arrayContaining(["core", "hsk1"])); // tags preserved
  });

  it("re-imports cleanly after a FUTURE schema bump — no data silently dropped", () => {
    const store = new WordStore();
    store.upsert({ lang: "zh-Hant", word: "學習", status: "known", notes: "n", tags: ["t"] });
    const doc = toUserDoc(store, emptyUserDoc("u", "", DEFAULT_SETTINGS), "2026-06-24T10:00:00.000Z");
    doc.grammar = {
      entries: [{ id: "ba-construction", status: "known", statusUpdatedAt: "2026-06-24T10:00:00.000Z", notes: "gn", tags: ["g"] }],
    };

    // Simulate a hypothetical future schema version.
    const future = JSON.parse(JSON.stringify({ ...doc, schema: 999 })) as unknown;
    const migrated = migrateUserDoc(future);

    expect(migrated.schema).toBe(USER_DOC_SCHEMA);
    const ws = WordStore.fromDoc(migrated.store);
    expect(ws.getStatus("zh-Hant", "學習")).toBe("known");
    expect(ws.get("zh-Hant", "學習")?.notes).toBe("n");
    expect(migrated.grammar?.entries[0]?.id).toBe("ba-construction");
    expect(migrated.grammar?.entries[0]?.notes).toBe("gn");
  });

  it("migrates a schema-1 doc (no grammar slot) and scrubs the leftover email", () => {
    const legacy = {
      schema: 1,
      userId: "u",
      updatedAt: "2026-01-01T00:00:00.000Z",
      profile: { rail: "vi", uiLang: "vi", email: "leftover@old.com" },
      settings: DEFAULT_SETTINGS,
      store: {
        schema: "tsumugu/word-store@2",
        updatedAt: "2026-01-01T00:00:00.000Z",
        entries: [{ lang: "zh-Hant", word: "你好", status: "known" }],
      },
    };
    const migrated = migrateUserDoc(legacy);
    expect(migrated.schema).toBe(USER_DOC_SCHEMA);
    expect(migrated.grammar).toBeUndefined();
    expect(migrated.profile.email).toBe(""); // zero-PII
    expect(WordStore.fromDoc(migrated.store).getStatus("zh-Hant", "你好")).toBe("known");
  });
});

describe("grammar-known slot (C7)", () => {
  it("merges grammar entries never-demoting, keeping notes/tags", () => {
    const a: UserDoc = {
      ...emptyUserDoc("u", "", DEFAULT_SETTINGS),
      grammar: { entries: [{ id: "g1", status: "known", statusUpdatedAt: "2026-06-24T10:00:00.000Z", notes: "keep", tags: ["x"] }] },
    };
    const b: UserDoc = {
      ...emptyUserDoc("u", "", DEFAULT_SETTINGS),
      updatedAt: "2026-06-25T00:00:00.000Z",
      grammar: {
        entries: [
          { id: "g1", status: "2", statusUpdatedAt: "2026-06-23T00:00:00.000Z" }, // older, lower — must lose
          { id: "g2", status: "4", statusUpdatedAt: "2026-06-25T00:00:00.000Z" },
        ],
      },
    };
    const { merged } = mergeUserDocs(a, b, "2026-06-26T00:00:00.000Z");
    const g1 = merged.grammar?.entries.find((e) => e.id === "g1");
    expect(g1?.status).toBe("known");
    expect(g1?.notes).toBe("keep");
    expect(merged.grammar?.entries.find((e) => e.id === "g2")?.status).toBe("4");
  });
});

describe("PII hygiene (C3)", () => {
  it("emptyUserDoc never keeps an email even if one is passed", () => {
    expect(emptyUserDoc("u", "someone@example.com", DEFAULT_SETTINGS).profile.email).toBe("");
    expect(emptyUserDoc("u", "", DEFAULT_SETTINGS).profile.email).toBe("");
  });
});