import { afterEach, describe, expect, it, vi } from "vitest";
import { WordStore } from "@tsumugu/engine";
import { DEFAULT_SETTINGS } from "../app/settings.js";
import { USER_DOC_SCHEMA, emptyUserDoc } from "./userDoc.js";
import { UrlRemoteStore, createDefaultRemoteStore, type RemoteStore } from "./remoteStore.js";

describe("UrlRemoteStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns null for an empty url without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(new UrlRemoteStore("").get("u")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null on 404 and throws on other HTTP errors", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const remote = new UrlRemoteStore("https://example.test/doc.json");

    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    await expect(remote.get("u")).resolves.toBeNull();

    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await expect(remote.get("u")).rejects.toThrow("Sync pull failed: 503");
  });

  it("migrates a pulled doc and does not write back", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const remote = new UrlRemoteStore("https://example.test/doc.json");
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        schema: 1,
        userId: "u",
        updatedAt: "2026-06-24T00:00:00.000Z",
        profile: { email: "secret@example.com", rail: "en", uiLang: "en" },
        settings: DEFAULT_SETTINGS,
        store: {
          schema: "tsumugu/word-store@2",
          updatedAt: "2026-06-24T00:00:00.000Z",
          entries: [{ lang: "zh-Hant", word: "山", status: "known" }],
        },
      }),
    });

    const doc = await remote.get("u");
    expect(doc?.schema).toBe(USER_DOC_SCHEMA);
    expect(doc?.profile.email).toBe("");
    expect(WordStore.fromDoc(doc!.store).getStatus("zh-Hant", "山")).toBe("known");

    const calls = fetchMock.mock.calls.length;
    const saved = doc ?? emptyUserDoc("u", "", DEFAULT_SETTINGS);
    const port: RemoteStore = remote;
    await port.put("u", saved);
    await port.delete("u");
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});

describe("createDefaultRemoteStore", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("persists through the local sim when no sync URL is configured", async () => {
    const remote = createDefaultRemoteStore();
    const doc = emptyUserDoc("local-user", "a@b.c", DEFAULT_SETTINGS);
    await remote.put("local-user", doc);
    expect((await remote.get("local-user"))?.userId).toBe("local-user");
    expect(localStorage.getItem("tsumugu-sim-server/local-user")).toContain("local-user");
    await remote.delete("local-user");
    expect(await remote.get("local-user")).toBeNull();
  });
});
