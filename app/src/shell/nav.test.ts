// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTopNav, type TopNavController } from "./nav.js";
import { DEFAULT_SETTINGS } from "../app/settings.js";

function makeNav(): TopNavController {
  return createTopNav({
    onNavigate: () => {},
    onRailChange: () => {},
    onPaletteChange: () => {},
    onThemeToggle: () => {},
    onImport: () => {},
    onCommandK: () => {},
    onContinue: () => {},
    getSettings: () => ({ ...DEFAULT_SETTINGS }),
    onSettingsChange: () => {},
    initialRail: "en",
  });
}

describe("createTopNav (Bound Volume chrome)", () => {
  let ctrl: TopNavController;

  beforeEach(() => {
    document.documentElement.dataset.rail = "en";
    ctrl = makeNav();
    document.body.append(ctrl.el);
  });

  afterEach(() => {
    ctrl.destroy();
  });

  it("renders the brand lockup: 紡 seal + Tsumugu word + Beta pill", () => {
    expect(ctrl.el.querySelector(".brand .knot")?.textContent).toBe("紡");
    expect(ctrl.el.querySelector(".brand .word")?.textContent).toBe("Tsumugu");
    expect(ctrl.el.querySelector(".brand .beta-pill")?.textContent).toBe("Beta");
  });

  it("renders the five bilingual Han+English nav items in order", () => {
    const navs = Array.from(
      ctrl.el.querySelectorAll<HTMLAnchorElement>(".primary-nav .navlink"),
    ).map((a) => a.dataset.nav);
    expect(navs).toEqual(["home", "library", "reader", "blog", "about"]);

    const library = ctrl.el.querySelector<HTMLAnchorElement>('.navlink[data-nav="library"]');
    expect(library?.textContent).toContain("課本架");
    expect(library?.querySelector(".en")?.textContent).toBe("Library");
    expect(
      ctrl.el.querySelector<HTMLAnchorElement>('.navlink[data-nav="reader"]')?.textContent,
    ).toContain("讀");
  });

  it("points the Blog nav item at the static /blog/ index (leaves the SPA)", () => {
    const blog = ctrl.el.querySelector<HTMLAnchorElement>('.navlink[data-nav="blog"]');
    expect(blog?.getAttribute("href")).toBe("/blog/");
    expect(blog?.textContent).toContain("誌");
  });

  it("exposes the ⌘K search hint and the theme toggle", () => {
    expect(ctrl.el.querySelector("#cmdkBtn.khint")).not.toBeNull();
    expect(ctrl.el.querySelector("#cmdkBtn kbd")?.textContent).toBe("⌘K");
    expect(ctrl.el.querySelector("#themeBtn.theme-toggle")).not.toBeNull();
  });

  it("sets aria-current on the active surface only", () => {
    ctrl.setActive("library");
    const current = ctrl.el.querySelectorAll('.navlink[aria-current="page"]');
    expect(current.length).toBe(1);
    expect((current[0] as HTMLElement).dataset.nav).toBe("library");

    ctrl.setActive("about");
    const about = ctrl.el.querySelector('.navlink[aria-current="page"]');
    expect((about as HTMLElement).dataset.nav).toBe("about");
    expect(ctrl.el.querySelector('.navlink[data-nav="library"]')?.hasAttribute("aria-current")).toBe(
      false,
    );
  });
});
