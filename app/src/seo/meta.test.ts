import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { updateSeo } from "./meta.js";

describe("updateSeo", () => {
  beforeEach(() => {
    document.title = "before";
    document.documentElement.lang = "en";
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove());
  });

  afterEach(() => {
    document.title = "";
  });

  it("sets title, description meta, and html lang for EN rail", () => {
    updateSeo("library", "en");
    expect(document.title.length).toBeGreaterThan(0);
    expect(document.documentElement.lang).toBe("en");
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    expect(meta?.content.length).toBeGreaterThan(0);
  });

  it("sets vi lang for VI rail", () => {
    updateSeo("home", "vi");
    expect(document.documentElement.lang).toBe("vi");
  });
});