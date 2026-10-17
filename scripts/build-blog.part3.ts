export const SITE_ORIGIN = (process.env.VITE_SITE_ORIGIN ?? "https://tsumugu.cc").replace(/\/$/, "");

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  body: string;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error("blog: missing YAML frontmatter");
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split("\n")) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2]!.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[kv[1]!] = val;
  }
  return { meta, body: m[2]!.trim() };
}

export function parsePostFile(contents: string, filename: string): BlogPost {
  const { meta, body } = parseFrontmatter(contents);
  const slug = meta.slug || filename.replace(/\.md$/, "");
  const title = meta.title;
  const date = meta.date;
  const description = meta.description;
  if (!title || !date || !description) {
    throw new Error(`blog: ${filename} requires title, date, description in frontmatter`);
  }
  return { slug, title, date, description, body };
}

export function publishableBody(body: string): string {
  const cut = body.search(/\n## Maintenance\b/);
  return (cut >= 0 ? body.slice(0, cut) : body).trim();
}

export function readingMinutes(body: string): number {
  const words = publishableBody(body)
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`)
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_m, label: string, href: string) =>
        `<a href="${href}" rel="noopener"${href.startsWith("http") ? ' target="_blank"' : ""}>${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, (_m, b: string) => `<strong>${b}</strong>`);
}

export function bodyToHtml(body: string): string {
  const lines = publishableBody(body).split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${renderInline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      out.push(`<ul>${list.map((li) => `<li>${renderInline(li)}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  const flush = () => {
    flushPara();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    
    if (/^\s*<svg[\s>]/.test(line)) {
      flush();
      const raw: string[] = [line];
      while (i < lines.length && !/<\/svg>\s*$/.test(lines[i]!)) {
        i++;
        if (i < lines.length) raw.push(lines[i]!);
      }
      out.push(raw.join("\n"));
      continue;
    }

    
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) {
        code.push(lines[i]!);
        i++;
      }
      const lang = fence[1] ? ` data-lang="${escapeHtml(fence[1])}"` : "";
      out.push(`<pre${lang}><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    
    if (line.trim() === "") {
      flush();
      continue;
    }

    
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      const level = Math.min(h[1]!.length + 1, 6); 
      out.push(`<h${level}>${renderInline(h[2]!.trim())}</h${level}>`);
      continue;
    }

    
    if (
      /^\s*\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[i + 1]!)
    ) {
      flush();
      const splitRow = (row: string): string[] =>
        row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());
      const headCells = splitRow(line);
      i += 2; 
      const bodyRows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]!)) {
        bodyRows.push(splitRow(lines[i]!));
        i++;
      }
      i--; 
      const thead = `<thead><tr>${headCells.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${bodyRows
        .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      flushPara();
      list.push(li[1]!.trim());
      continue;
    }

    
    flushList();
    para.push(line.trim());
  }

  flush();
  return out.join("\n");
}
