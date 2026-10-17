#!/usr/bin/env tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

export const SHELL_VERSION = "v3";
export const DEFAULT_SHELL_SOURCE = resolve(REPO_ROOT, "mockups/site/_shell.html");

export interface NavLink {
  href: string;
  nav: string;
  label: string;
}

export interface ShellContract {
  version: string;
  tokensCss: string;
  topnavHtml: string;
  nav: NavLink[];
}

function slice(html: string, open: RegExp, closeTag: string): string {
  const m = open.exec(html);
  if (!m) throw new Error(`shell-contract: opening tag ${open} not found in source`);
  const start = m.index;
  const end = html.indexOf(closeTag, start);
  if (end < 0) throw new Error(`shell-contract: closing ${closeTag} not found in source`);
  return html.slice(start, end + closeTag.length);
}


function stripCssComments(css: string): string {
  const comment = new RegExp("/" + "\\*" + "[\\s\\S]*?" + "\\*" + "/", "g");
  return css.replace(comment, "").replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "");
}

export function extractTokensCss(html: string): string {
  const block = slice(html, /<style>/, "</style>");
  const css = block.replace(/^<style>/, "").replace(/<\/style>$/, "").trim();
  return `${stripCssComments(css)}\n`;
}


export function extractTopnav(html: string): string {
  const header = slice(html, /<header class="topnav">/, "</header>");
  return header.replace(
    /<header class="topnav">/,
    `<header class="topnav" data-shell="${SHELL_VERSION}">`,
  );
}


export function extractNav(html: string): NavLink[] {
  const navBlock = slice(html, /<nav class="primary-nav"[^>]*>/, "</nav>");
  const links: NavLink[] = [];
  const re = /<a\s+href="([^"]+)"\s+data-nav="([^"]+)"\s*>([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(navBlock)) !== null) {
    links.push({ href: m[1]!, nav: m[2]!, label: m[3]!.trim() });
  }
  return links;
}

export function buildShellContract(html: string): ShellContract {
  return {
    version: SHELL_VERSION,
    tokensCss: extractTokensCss(html),
    topnavHtml: extractTopnav(html),
    nav: extractNav(html),
  };
}

function artifactFiles(dir: string): { css: string; topnav: string; nav: string } {
  return {
    css: join(dir, "shell-tokens.css"),
    topnav: join(dir, "topnav.html"),
    nav: join(dir, "nav.json"),
  };
}

export function emit(dir: string, contract: ShellContract): void {
  mkdirSync(dir, { recursive: true });
  const f = artifactFiles(dir);
  writeFileSync(f.css, contract.tokensCss, "utf8");
  writeFileSync(f.topnav, contract.topnavHtml + "\n", "utf8");
  writeFileSync(f.nav, JSON.stringify({ version: contract.version, nav: contract.nav }, null, 2) + "\n", "utf8");
}


export function checkDrift(dir: string, contract: ShellContract): string[] {
  const f = artifactFiles(dir);
  const drift: string[] = [];
  const cmp = (path: string, expected: string, label: string): void => {
    if (!existsSync(path) || readFileSync(path, "utf8") !== expected) drift.push(label);
  };
  cmp(f.css, contract.tokensCss, "shell-tokens.css");
  cmp(f.topnav, contract.topnavHtml + "\n", "topnav.html");
  cmp(f.nav, JSON.stringify({ version: contract.version, nav: contract.nav }, null, 2) + "\n", "nav.json");
  return drift;
}

function main(): void {
  const argv = process.argv.slice(2);
  const sourceIdx = argv.indexOf("--source");
  const source = sourceIdx >= 0 ? resolve(argv[sourceIdx + 1]!) : DEFAULT_SHELL_SOURCE;
  const emitIdx = argv.indexOf("--emit");
  const checkIdx = argv.indexOf("--check");
  const outDir = resolve(
    (emitIdx >= 0 ? argv[emitIdx + 1] : checkIdx >= 0 ? argv[checkIdx + 1] : undefined) ??
      resolve(REPO_ROOT, "app/public/shell"),
  );

  const contract = buildShellContract(readFileSync(source, "utf8"));

  if (emitIdx >= 0) {
    emit(outDir, contract);
    console.log(`[shell-contract] emitted ${SHELL_VERSION} → ${outDir} (${contract.nav.length} nav links)`);
    return;
  }
  const drift = checkDrift(outDir, contract);
  if (drift.length) {
    console.error(`[shell-contract] DRIFT vs ${source}: ${drift.join(", ")} — re-run --emit`);
    process.exit(1);
  }
  console.log(`[shell-contract] OK: ${outDir} matches ${source}`);
}

const isCliEntry =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntry) main();
