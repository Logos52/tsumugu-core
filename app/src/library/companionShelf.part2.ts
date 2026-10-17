import type { CatalogEntry } from "../catalog/types.js";

export interface CompanionGrammar {
  name: string;
  
  edSlug?: string;
}

export interface CompanionLesson {
  
  unit: string;
  book?: number;
  lesson?: number;
  title?: string;
  theme?: string;
  grammar?: CompanionGrammar[];
}

export interface LessonGroup {
  book: number;
  lesson: number;
  unit: string;
  title: string;
  theme: string;
  readings: CatalogEntry[];
  grammar: CompanionGrammar[];
  articles: number;
  
  unionCoverage: number;
}

export interface BookGroup {
  book: number;
  lessons: LessonGroup[];
}

function parseUnit(unit: string): { book?: number; lesson?: number } {
  const m = /B\s*(\d+)\s*L\s*(\d+)/i.exec(unit ?? "");
  if (!m) return {};
  return { book: Number(m[1]), lesson: Number(m[2]) };
}

export function buildCompanionSpine(
  catalog: CatalogEntry[],
  lessons: CompanionLesson[] = [],
): BookGroup[] {
  const metaByKey = new Map<string, CompanionLesson>();
  for (const l of lessons) {
    const bk = l.book ?? parseUnit(l.unit).book;
    const ls = l.lesson ?? parseUnit(l.unit).lesson;
    if (bk != null && ls != null) metaByKey.set(`${bk}:${ls}`, l);
  }

  const groups = new Map<string, LessonGroup>();
  for (const entry of catalog) {
    if (!entry.binding) continue;
    const { book, lesson } = entry.binding;
    const key = `${book}:${lesson}`;
    let g = groups.get(key);
    if (!g) {
      const meta = metaByKey.get(key);
      g = {
        book,
        lesson,
        unit: meta?.unit ?? `B${book}L${String(lesson).padStart(2, "0")}`,
        title: meta?.title ?? "",
        theme: meta?.theme ?? "",
        readings: [],
        grammar: meta?.grammar ?? [],
        articles: 0,
        unionCoverage: 0,
      };
      groups.set(key, g);
    }
    g.readings.push(entry);
  }

  for (const g of groups.values()) {
    g.articles = g.readings.length;
    
    
    g.unionCoverage = g.articles > 0 ? 100 : 0;
  }

  const byBook = new Map<number, LessonGroup[]>();
  for (const g of groups.values()) {
    const arr = byBook.get(g.book) ?? [];
    arr.push(g);
    byBook.set(g.book, arr);
  }

  return [...byBook.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([book, ls]) => ({ book, lessons: ls.sort((a, b) => a.lesson - b.lesson) }));
}
