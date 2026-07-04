import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHELL_SOURCE,
  SHELL_VERSION,
  buildShellContract,
  checkDrift,
  extractNav,
  extractTopnav,
} from "./build-shell-contract.js";

const HERE = dirname(fileURLToPath(import.meta.url));

// A minimal fixture so the test does not depend on the (stale) mockups source shape.
const FIXTURE = `<!doctype html><html data-page="__PAGE__"><head><style>
:root{--tsg-accent:#6b4bd6}
header.topnav{display:flex}
</style></head>
<header class="topnav">
  <a class="brand" href="home.html"><span class="word">Tsumugu</span></a>
  <nav class="primary-nav" aria-label="Primary">
    <a href="home.html" data-nav="home">Home</a>
    <a href="library.html" data-nav="library">Library</a>
    <a href="reader.html" data-nav="reader">Reader</a>
  </nav>
</header>
<main><!-- __CONTENT__ --></main></html>`;

describe("shell-contract extractors", () => {
  it("extracts the nav link set with data-nav keys", () => {
    expect(extractNav(FIXTURE)).toEqual([
      { href: "home.html", nav: "home", label: "Home" },
      { href: "library.html", nav: "library", label: "Library" },
      { href: "reader.html", nav: "reader", label: "Reader" },
    ]);
  });

  it("stamps the topnav fragment with data-shell version", () => {
    const topnav = extractTopnav(FIXTURE);
    expect(topnav).toContain(`<header class="topnav" data-shell="${SHELL_VERSION}">`);
    expect(topnav).toContain("</header>");
  });

  it("builds a versioned contract with tokens css", () => {
    const c = buildShellContract(FIXTURE);
    expect(c.version).toBe(SHELL_VERSION);
    expect(c.tokensCss).toContain("--tsg-accent");
    expect(c.nav).toHaveLength(3);
  });

  it("checkDrift flags every artifact when nothing is emitted on disk", () => {
    const c = buildShellContract(FIXTURE);
    const drift = checkDrift(resolve(HERE, "__no_such_shell_dir__"), c);
    expect(drift).toEqual(["shell-tokens.css", "topnav.html", "nav.json"]);
  });

  it("parses the real (stale) mockups shell source without throwing", () => {
    // Read-only sanity: the generator reads mockups/site/_shell.html today, but the
    // canonical source may be repointed to Lane A/B's Seal chrome before wiring.
    const html = readFileSync(DEFAULT_SHELL_SOURCE, "utf8");
    const c = buildShellContract(html);
    expect(c.nav.map((n) => n.nav)).toEqual(["home", "library", "reader"]);
    expect(c.tokensCss.length).toBeGreaterThan(100);
  });
});
