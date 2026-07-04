// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { resetUserStoreForTest } from "../store/userStore.js";
import { resetSessionForTest } from "./session.js";
import { buildSyncPanelContent, mountSyncPanel } from "./accountView.js";

describe("Sync panel (C1)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserStoreForTest();
    resetSessionForTest();
    document.body.innerHTML = "";
  });

  it("renders NO surface when VITE_FEATURE_SYNC is off (default)", () => {
    const ctrl = mountSyncPanel(document.body);
    // Flag off by default in tests → nothing mounted, controller is inert.
    expect(document.querySelector(".tsg-account-backdrop")).toBeNull();
    expect(document.querySelector(".tsg-sync-body")).toBeNull();
    expect(() => {
      ctrl.open();
      ctrl.close();
      ctrl.destroy();
    }).not.toThrow();
  });

  it("the (ungated) panel body offers export/import + share + sync code + Anki", () => {
    const body = buildSyncPanelContent();
    const text = body.textContent ?? "";
    expect(text).toContain("Export file");
    expect(text).toContain("Import file");
    expect(text).toContain("Share");
    expect(text).toContain("Generate code");
    expect(text).toContain("Apply code");
    expect(text).toContain("Pull + merge");
    expect(text).toContain(".apkg");
    // A drop target exists for drag/drop import.
    expect(body.querySelector(".tsg-sync-drop")).not.toBeNull();
  });
});
