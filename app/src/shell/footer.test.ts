// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderAppFooter } from "./footer.js";

describe("renderAppFooter (shared site footer)", () => {
  let footer: HTMLElement;

  beforeEach(() => {
    footer = document.createElement("footer");
    footer.id = "app-footer";
    document.body.append(footer);
  });

  afterEach(() => {
    footer.remove();
  });

  it("renders the brand lockup with the Beta pill", () => {
    renderAppFooter();
    const brand = footer.querySelector(".ft-brand");
    expect(brand).not.toBeNull();
    expect(brand?.textContent).toContain("紡");
    expect(brand?.textContent).toContain("Tsumugu");
    expect(footer.querySelector(".ft-brand .beta-pill")?.textContent).toBe("Beta");
  });

  it("carries no self-narration — no tagline, corpus note, or type credit", () => {
    renderAppFooter();
    expect(footer.querySelector(".ft-tagline")).toBeNull();
    expect(footer.querySelector(".ft-meta")).toBeNull();
    expect(footer.querySelector(".ft-type")).toBeNull();
  });

  it("links every secondary surface so nothing dead-ends (blog → static index)", () => {
    renderAppFooter();
    const hrefs = Array.from(footer.querySelectorAll<HTMLAnchorElement>(".ft-links a")).map(
      (a) => a.getAttribute("href"),
    );
    expect(hrefs).toContain("#home");
    expect(hrefs).toContain("#library");
    expect(hrefs).toContain("#read");
    expect(hrefs).toContain("#about");
    expect(hrefs).toContain("#privacy");
    expect(hrefs).toContain("#feedback");
    expect(hrefs).toContain("/blog/");
  });

  it("no-ops when the footer host is absent", () => {
    footer.remove();
    expect(() => renderAppFooter()).not.toThrow();
  });
});
