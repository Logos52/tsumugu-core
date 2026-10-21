
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WordStore } from "@tsumugu/engine";
import { DEFAULT_SETTINGS } from "../app/settings.js";
import { LocalSimRemoteStore } from "./remoteStore.js";
import { emptyUserDoc, toUserDoc } from "./userDoc.js";
import { KNOWN_CHARS_KEY } from "./knownChars.js";
import { UserStore, resetUserStoreForTest } from "./userStore.js";

describe("UserStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserStoreForTest();
  });

  it("persists tsumugu-session on login", async () => {
    const remote = new LocalSimRemoteStore();
    const store = new UserStore(undefined, remote);

    await store.login("u_test", "test@example.com");

    const raw = localStorage.getItem("tsumugu-session");
    expect(raw).toBeTruthy();
    const sess = JSON.parse(raw!) as { userId: string; email: string };
    expect(sess.userId).toBe("u_test");
    expect(sess.email).toBe("test@example.com");
    expect(store.getAuth().status).toBe("logged-in");
  });

  it("merges local anon progress into remote doc on login", async () => {
    const remote = new LocalSimRemoteStore();
    const store = new UserStore(undefined, remote);

    store.getWordStore().setStatus("zh-Hant", "咖啡", "4");
    store.notifyChange();

    await store.login("u_merge", "merge@example.com");

    expect(store.getWordStore().getStatus("zh-Hant", "咖啡")).toBe("4");

    const remoteDoc = await remote.get("u_merge");
    expect(remoteDoc).toBeTruthy();
    const ws = WordStore.fromDoc(remoteDoc!.store);
    expect(ws.getStatus("zh-Hant", "咖啡")).toBe("4");
  });

  it("clears tsumugu-session on logout", async () => {
    const store = new UserStore(undefined, new LocalSimRemoteStore());
    await store.login("u_out", "out@example.com");

    store.logout();

    expect(localStorage.getItem("tsumugu-session")).toBeNull();
    expect(store.getAuth().status).toBe("logged-out");
  });

  it("importUserDoc merges a full doc never-demoting (C1/C4)", () => {
    const store = new UserStore(undefined, new LocalSimRemoteStore());
    
    store.getWordStore().setStatus("zh-Hant", "山", "2", undefined, { at: "2026-06-24T00:00:00.000Z" });
    store.notifyChange();

    
    const other = new WordStore();
    other.upsert({ lang: "zh-Hant", word: "山", status: "known", statusUpdatedAt: "2026-06-25T00:00:00.000Z" });
    other.upsert({ lang: "zh-Hant", word: "水", status: "4", statusUpdatedAt: "2026-06-25T00:00:00.000Z" });
    const incoming = toUserDoc(other, emptyUserDoc("u", "", DEFAULT_SETTINGS), "2026-06-25T00:00:00.000Z");

    store.importUserDoc(incoming);

    expect(store.getWordStore().getStatus("zh-Hant", "山")).toBe("known");
    expect(store.getWordStore().getStatus("zh-Hant", "水")).toBe("4");
  });

  it("writes the known-char federation mirror on a word change (C5)", () => {
    const store = new UserStore(undefined, new LocalSimRemoteStore());
    store.getWordStore().setStatus("zh-Hant", "朋友", "known");
    store.notifyChange();
    const raw = localStorage.getItem(KNOWN_CHARS_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).chars).toContain("朋");
  });
});

describe("UserStore.pullFromUrl — UrlRemoteStore merge (C1)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserStoreForTest();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pulls a doc from a BYO URL and merges it never-demoting", async () => {
    const store = new UserStore(undefined, new LocalSimRemoteStore());
    store.getWordStore().setStatus("zh-Hant", "書", "2", undefined, { at: "2026-06-24T00:00:00.000Z" });
    store.notifyChange();

    const remoteWs = new WordStore();
    remoteWs.upsert({ lang: "zh-Hant", word: "書", status: "known", statusUpdatedAt: "2026-06-25T00:00:00.000Z" });
    remoteWs.upsert({ lang: "zh-Hant", word: "筆", status: "4", statusUpdatedAt: "2026-06-25T00:00:00.000Z" });
    const remoteDoc = toUserDoc(remoteWs, emptyUserDoc("u", "", DEFAULT_SETTINGS), "2026-06-25T00:00:00.000Z");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => remoteDoc }) as unknown as Response),
    );

    const { report } = await store.pullFromUrl("https://example.test/doc.json");
    expect(report.wordsTouched).toBeGreaterThan(0);
    expect(store.getWordStore().getStatus("zh-Hant", "書")).toBe("known"); 
    expect(store.getWordStore().getStatus("zh-Hant", "筆")).toBe("4"); 
  });

  it("reports nothing to pull when the URL is missing", async () => {
    const store = new UserStore(undefined, new LocalSimRemoteStore());
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as unknown as Response),
    );
    const { report } = await store.pullFromUrl("https://example.test/missing.json");
    expect(report).toEqual({ hadConflict: false, wordsTouched: 0, note: "Nothing to pull." });
    expect(store.getWordStore().all()).toEqual([]);
  });
});

describe("applySeedRecords", () => {
  const clock = { now: () => new Date("2026-06-24T12:00:00.000Z") };

  beforeEach(() => {
    localStorage.clear();
    resetUserStoreForTest();
  });

  it("returns zeros and leaves the store untouched for an empty seed", () => {
    const store = new UserStore(clock, new LocalSimRemoteStore());
    store.getWordStore().setStatus("zh-Hant", "山", "2");
    expect(store.applySeedRecords([])).toEqual({ applied: 0, conflicts: 0 });
    expect(store.getWordStore().getStatus("zh-Hant", "山")).toBe("2");
  });

  it("seeds missing words at 4 and refuses to demote a known word", async () => {
    const remote = new LocalSimRemoteStore();
    const store = new UserStore(clock, remote);
    await store.login("u_seed", "seed@example.com");
    store.getWordStore().setStatus("zh-Hant", "山", "known", undefined, { at: "2026-06-20T00:00:00.000Z" });
    store.flushSave(true);

    const result = store.applySeedRecords([
      { lang: "zh-Hant", word: "山", status: "1", at: "2026-06-25T00:00:00.000Z" },
      { lang: "", word: "水" },
      { lang: "zh-Hant", word: "" },
    ]);

    expect(store.getWordStore().getStatus("zh-Hant", "山")).toBe("known");
    expect(store.getWordStore().getStatus("zh-Hant", "水")).toBe("4");
    expect(result.applied).toBe(2);
    expect(result.conflicts).toBe(1);
    const saved = await remote.get("u_seed");
    expect(saved?.store.entries.find((e) => e.word === "水")?.status).toBe("4");
    expect(saved?.store.entries.find((e) => e.word === "山")?.status).toBe("known");
  });

  it("promotes an older learning grade when the seed is known", () => {
    const store = new UserStore(clock, new LocalSimRemoteStore());
    store.getWordStore().setStatus("zh-Hant", "書", "2", undefined, { at: "2026-06-01T00:00:00.000Z" });
    const result = store.applySeedRecords([
      { lang: "zh-Hant", word: "書", status: "known", at: "2026-06-20T00:00:00.000Z" },
    ]);
    expect(store.getWordStore().getStatus("zh-Hant", "書")).toBe("known");
    expect(result.conflicts).toBe(0);
    expect(result.applied).toBe(1);
  });
});

describe("deleteAccount and exportDoc", () => {
  const clock = { now: () => new Date("2026-06-24T12:00:00.000Z") };

  beforeEach(() => {
    localStorage.clear();
    resetUserStoreForTest();
  });

  it("drops the remote doc and local user doc and logs out", async () => {
    const remote = new LocalSimRemoteStore();
    const store = new UserStore(clock, remote);
    await store.login("u_del", "del@example.com");
    store.getWordStore().setStatus("zh-Hant", "山", "4");
    store.flushSave(true);
    expect(await remote.get("u_del")).toBeTruthy();

    store.deleteAccount();

    expect(await remote.get("u_del")).toBeNull();
    expect(localStorage.getItem("tsumugu-core/user-doc")).toBeNull();
    expect(store.getAuth()).toEqual({ userId: null, email: null, status: "logged-out" });
    expect(store.getDoc()).toBeNull();
    expect(store.getSyncStatus()).toBe("idle");
    expect(store.getWordStore().getStatus("zh-Hant", "山")).toBe("4");
  });

  it("exports the live word store when no account doc is loaded", () => {
    const store = new UserStore(clock, new LocalSimRemoteStore());
    store.getWordStore().setStatus("zh-Hant", "書", "known", undefined, { at: "2026-06-24T00:00:00.000Z" });
    const doc = store.exportDoc();
    expect(doc.userId).toBe("export");
    expect(doc.profile.email).toBe("");
    expect(doc.store.entries.find((e) => e.word === "書")?.status).toBe("known");
    const parsed = JSON.parse(store.exportJSON()) as { store: { entries: Array<{ word: string; status: string }> } };
    expect(parsed.store.entries.find((e) => e.word === "書")?.status).toBe("known");
  });
});