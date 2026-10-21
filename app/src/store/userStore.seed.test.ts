import { beforeEach, describe, expect, it } from "vitest";
import { LocalSimRemoteStore } from "./remoteStore.js";
import { UserStore, resetUserStoreForTest } from "./userStore.js";

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
