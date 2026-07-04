/**
 * Marketing Home — the static front at `#/` (WO-UNIFY-B amendment).
 * Structure (Seal-red mockup §5): hero H1 + hero-sub + EN/VI rail chooser +
 * one CTA into the library + a LIVE SAMPLE with the tappable cognate bridge.
 * No dashboard, no personal bento, no `tsumugu-session` gate.
 * EN/VI copy selected by the current rail. Rail chooser is two-way-synced with
 * the header rail switch.
 */

import { el, clear as domClear } from "../ui/dom.js";
import { applyI18n, tKey as t, getLocale } from "../i18n/strings.js";
import type { Surface } from "../app/router.js";

const SAMPLE_TOKENS = [
  { zh: "他", reading: { hv: "tha", py: "tā" }, st: "known" },
  { zh: "抬起", reading: { hv: "đài khởi", py: "táiqǐ" }, st: "known" },
  { zh: "頭", reading: { hv: "đầu", py: "tóu" }, st: "known" },
  { zh: "，", isPunct: true },
  { zh: "望", reading: { hv: "vọng", py: "wàng" }, st: "new", nw: true, bridge: true },
  { zh: "向", reading: { hv: "hướng", py: "xiàng" }, st: "known" },
  { zh: "那", reading: { hv: "na", py: "nà" }, st: "known" },
  { zh: "座", reading: { hv: "tọa", py: "zuò" }, st: "learning" },
  { zh: "高", reading: { hv: "cao", py: "gāo" }, st: "known" },
  { zh: "山", reading: { hv: "sơn", py: "shān" }, st: "known" },
  { zh: "。", isPunct: true },
];

const BRIDGE_SAMPLE = {
  char: "望",
  cognates: [
    { pre: "hy ", shared: "vọng", zh: "希望", en: "to hope" },
    { pre: "thất ", shared: "vọng", zh: "失望", en: "disappointed" },
    { pre: "nguyện ", shared: "vọng", zh: "願望", en: "aspiration" },
  ],
};

export interface HomeSurface {
  el: HTMLElement;
  render(rail: "en" | "vi"): void;
  destroy(): void;
}

export function createHomeSurface(opts: {
  onRailChange: (rail: "en" | "vi") => void;
  onNavigate: (s: Surface) => void;
}): HomeSurface {
  const container = el("section", { class: "tsg-home home-page", id: "home-surface" });

  function render(rail: "en" | "vi" = "en") {
    const locale = getLocale(rail);
    domClear(container);

    const wrap = el("div", { class: "wrap" });

    // ── BETA NOTICE — homepage only, temporary (under construction) ─────
    const beta = el("div", { class: "beta-banner" });
    beta.setAttribute("role", "note");
    beta.innerHTML =
      "<strong>Tsumugu is in beta and still under construction.</strong> " +
      'Your feedback is welcome — <a href="https://x.com/webigis" target="_blank" rel="noopener">@webigis</a> on X.';
    wrap.append(beta);

    // ── HERO ────────────────────────────────────────────────────────────
    const hero = el("section", { class: "hero" });
    hero.append(
      el("h1", { class: "hero-head", text: t("home.hero.headline", locale) }),
      el("p", { class: "hero-sub", text: t("home.hero.subhead", locale) }),
    );

    // Rail chooser (two cards; two-way synced with header rail switch)
    const chooser = el("div", { class: "rail-chooser", id: "railChooser" });
    chooser.append(el("div", { class: "chooser-label", text: t("home.rail.chooser", locale) }));

    const btnVi = el("button", {
      class: `chooser-btn vi ${rail === "vi" ? "active" : ""}`,
      attrs: { type: "button", "data-rail": "vi" },
      on: { click: () => opts.onRailChange("vi") },
    });
    btnVi.append(
      el("span", { class: "ch-tick", text: "✓" }),
      el("span", { class: "ch-flag", text: "越 · Tiếng Việt" }),
      el("span", { class: "ch-title", text: t("home.rail.btnVi", locale) }),
      el("span", { class: "moat-tag", text: t("home.rail.viMoat", locale) }),
    );

    const btnEn = el("button", {
      class: `chooser-btn en ${rail === "en" ? "active" : ""}`,
      attrs: { type: "button", "data-rail": "en" },
      on: { click: () => opts.onRailChange("en") },
    });
    btnEn.append(
      el("span", { class: "ch-tick", text: "✓" }),
      el("span", { class: "ch-flag", text: "英 · English" }),
      el("span", { class: "ch-title", text: t("home.rail.btnEn", locale) }),
      el("span", { class: "ch-note", text: t("home.rail.enNote", locale) }),
    );
    chooser.append(btnVi, btnEn);
    hero.append(chooser);

    // One CTA into the library
    const ctas = el("div", { class: "hero-ctas" });
    ctas.append(
      el("a", {
        class: "btn primary",
        attrs: { href: "#library" },
        text: t("home.cta.browse", locale),
        on: { click: (ev: Event) => { ev.preventDefault(); opts.onNavigate("library"); } },
      }),
    );
    hero.append(ctas);
    wrap.append(hero);

    // ── LIVE SAMPLE ─────────────────────────────────────────────────────
    const sampleWrap = el("section", { class: "home-sample" });
    const sampleHead = el("div", { class: "sample-head" });
    sampleHead.append(
      el("span", { class: "dot" }),
      el("span", { text: t("home.sample.title", locale) }),
    );
    sampleWrap.append(sampleHead);

    const prose = el("p", { class: "prose sample-prose" });
    SAMPLE_TOKENS.forEach((tok) => {
      if (tok.isPunct) {
        prose.append(el("span", { class: "punc", text: tok.zh }));
        return;
      }
      const w = el("span", { class: `w ${tok.st}${tok.nw ? " nw" : ""}`, dataset: { word: tok.zh } });
      const ruby = document.createElement("ruby");
      ruby.append(document.createTextNode(tok.zh));
      ruby.append(el("rt", { text: rail === "vi" ? (tok.reading?.hv ?? "") : (tok.reading?.py ?? "") }));
      w.append(ruby);
      if (tok.bridge) {
        w.addEventListener("click", (ev) => { ev.stopPropagation(); showSampleBridge(rail, w); });
      } else {
        w.addEventListener("click", () => {
          w.classList.add("sel");
          setTimeout(() => w.classList.remove("sel"), 420);
        });
      }
      prose.append(w);
    });
    sampleWrap.append(prose);
    wrap.append(sampleWrap);

    container.append(wrap);
    applyI18n(container);
  }

  // Bridge reveal card (reuses global #card / #scrim; VI rail only)
  function showSampleBridge(rail: "en" | "vi", anchor: HTMLElement) {
    if (rail !== "vi") {
      anchor.classList.add("sel");
      setTimeout(() => anchor.classList.remove("sel"), 420);
      return;
    }
    const card = document.getElementById("card");
    const scrim = document.getElementById("scrim");
    if (!card || !scrim) return;

    const cGlyph = card.querySelector("#cGlyph");
    const cReading = card.querySelector("#cReading");
    const cGloss = card.querySelector("#cGloss");
    const cBridge = card.querySelector<HTMLElement>("#cBridge");
    const cEn = card.querySelector<HTMLElement>("#cEnNote");
    const cCogs = card.querySelector<HTMLElement>("#cCogs");
    const cClose = card.querySelector<HTMLElement>("#cClose");

    if (cGlyph) cGlyph.textContent = BRIDGE_SAMPLE.char;
    if (cReading) cReading.textContent = "vọng";
    if (cGloss) cGloss.textContent = t("home.sample.gloss", "vi");
    card.classList.add("is-bridge");
    if (cBridge) cBridge.style.display = "";
    if (cEn) cEn.style.display = "none";
    if (cCogs) {
      domClear(cCogs);
      BRIDGE_SAMPLE.cognates.forEach((c) => {
        const row = el("div", { class: "cog" });
        row.innerHTML = `<span class="zh">${c.zh}</span><span class="vi"><span class="faint">${c.pre}</span><span class="shared">${c.shared}</span></span><span class="en">${c.en}</span>`;
        cCogs.append(row);
      });
    }
    if (cClose) cClose.textContent = t("home.sample.close", "vi");

    card.style.display = "block";
    scrim.style.display = "block";
    const closeFn = () => {
      card.style.display = "none";
      scrim.style.display = "none";
      card.classList.remove("is-bridge");
      document.querySelectorAll(".w.sel").forEach((x) => x.classList.remove("sel"));
      scrim.removeEventListener("click", closeFn);
    };
    scrim.addEventListener("click", closeFn, { once: true });
    anchor.classList.add("sel");
  }

  render("en");

  return {
    el: container,
    render,
    destroy() { container.remove(); },
  };
}
