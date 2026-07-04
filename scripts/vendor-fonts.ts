/**
 * Vendor self-hosted fonts from node_modules into app/public/fonts/.
 *
 * First-party font serving (privacy + §11 posture: no third-party calls):
 * copies ONLY the weights the site uses plus each css's referenced files, and
 * emits fonts.css for index.html + the blog template. Output is gitignored;
 * deterministic from the lockfile. Runs before dev/build (package.json).
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "app/public/fonts");

/** [package, css entry, output subdir] — the weights actually in the type system. */
const SOURCES = [
  ["@fontsource/inter", "400.css", "inter"],
  ["@fontsource/inter", "500.css", "inter"],
  ["@fontsource/inter", "600.css", "inter"],
  ["@fontsource/inter", "700.css", "inter"],
  ["@fontsource/inter", "800.css", "inter"],
  ["@fontsource/noto-sans-tc", "400.css", "noto-sans-tc"],
  ["@fontsource/noto-sans-tc", "500.css", "noto-sans-tc"],
  ["@fontsource/noto-sans-tc", "700.css", "noto-sans-tc"],
  ["lxgw-wenkai-tc-webfont", "lxgwwenkaitc-regular.css", "wenkai"],
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const imports = [];
const copied = new Set();
for (const [pkg, cssName, sub] of SOURCES) {
  const pkgDir = join(root, "node_modules", pkg);
  const css = readFileSync(join(pkgDir, cssName), "utf8");
  const subDir = join(out, sub);
  mkdirSync(subDir, { recursive: true });
  writeFileSync(join(subDir, cssName), css);
  imports.push(`@import "./${sub}/${cssName}";`);
  for (const m of css.matchAll(/url\((['"]?)(\.\/)?([^'")]+\.(?:woff2?|ttf|otf))\1\)/g)) {
    const rel = m[3];
    const key = `${sub}/${rel}`;
    if (copied.has(key)) continue;
    copied.add(key);
    const dest = join(subDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(pkgDir, rel), dest);
  }
}
writeFileSync(join(out, "fonts.css"), imports.join("\n") + "\n");
process.stdout.write(`fonts vendored: ${copied.size} files, ${imports.length} css entries → app/public/fonts/\n`);
