import type { Band, CatalogEntry, ReadingKind } from "./types.js";

export interface CatalogFacets {
  band?: Band[];
  kind?: ReadingKind[];
  topic?: string[];
  binding?: { book?: number; lesson?: number };
  hasAudio?: boolean;
}

export type SortMode = "level" | "newest" | "length";

const BANDS: Band[] = ["A1", "A2", "B1"];
const KINDS: ReadingKind[] = ["story", "dialogue", "explainer", "byo"];

function parseHash(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return new URLSearchParams();
  return new URLSearchParams(raw);
}

function splitList(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function facetsFromHash(hash: string): CatalogFacets {
  const params = parseHash(hash);
  const facets: CatalogFacets = {};

  const bandRaw = splitList(params.get("band"));
  if (bandRaw) {
    const bands = bandRaw.filter((b): b is Band => BANDS.includes(b as Band));
    if (bands.length > 0) facets.band = bands;
  }

  const kindRaw = splitList(params.get("kind"));
  if (kindRaw) {
    const kinds = kindRaw.filter((k): k is ReadingKind => KINDS.includes(k as ReadingKind));
    if (kinds.length > 0) {
      facets.kind = [...kinds].sort((a, b) => KINDS.indexOf(a) - KINDS.indexOf(b));
    }
  }

  const topicRaw = splitList(params.get("topic"));
  if (topicRaw) facets.topic = topicRaw;

  const book = params.get("book");
  const lesson = params.get("lesson");
  if (book || lesson) {
    facets.binding = {};
    if (book) {
      const n = Number(book);
      if (!Number.isNaN(n)) facets.binding.book = n;
    }
    if (lesson) {
      const n = Number(lesson);
      if (!Number.isNaN(n)) facets.binding.lesson = n;
    }
  }

  const audio = params.get("audio");
  if (audio === "1" || audio === "true") {
    facets.hasAudio = true;
  }

  return facets;
}

export function facetsToHash(f: CatalogFacets): string {
  const params = new URLSearchParams();

  if (f.band && f.band.length > 0) {
    params.set("band", [...f.band].sort().join(","));
  }
  if (f.kind && f.kind.length > 0) {
    params.set(
      "kind",
      [...f.kind].sort((a, b) => KINDS.indexOf(a) - KINDS.indexOf(b)).join(","),
    );
  }
  if (f.topic && f.topic.length > 0) {
    params.set("topic", [...f.topic].sort().join(","));
  }
  if (f.binding?.book != null) {
    params.set("book", String(f.binding.book));
  }
  if (f.binding?.lesson != null) {
    params.set("lesson", String(f.binding.lesson));
  }
  if (f.hasAudio) {
    params.set("audio", "1");
  }

  const qs = params.toString();
  return qs ? `#${qs}` : "";
}

export function applyFacets(catalog: CatalogEntry[], f: CatalogFacets): CatalogEntry[] {
  return catalog.filter((entry) => {
    if (f.band && f.band.length > 0 && !f.band.includes(entry.band)) return false;
    if (f.kind && f.kind.length > 0 && !f.kind.includes(entry.kind)) return false;
    if (f.topic && f.topic.length > 0) {
      if (!entry.topic || !f.topic.includes(entry.topic)) return false;
    }
    if (f.binding) {
      if (!entry.binding) return false;
      if (f.binding.book != null && entry.binding.book !== f.binding.book) return false;
      if (f.binding.lesson != null && entry.binding.lesson !== f.binding.lesson) return false;
    }
    if (f.hasAudio != null && entry.hasAudio !== f.hasAudio) return false;
    return true;
  });
}

/** Extended query state for Library (facets + search + sort), roundtrippable via hash. */
export interface LibraryQuery {
  facets: CatalogFacets;
  search: string;
  sort: SortMode;
}

export function queryFromHash(hash: string): LibraryQuery {
  const params = parseHash(hash);
  const facets = facetsFromHash(hash);
  const search = params.get("q")?.trim() ?? "";
  const sortRaw = params.get("sort");
  const sort: SortMode = sortRaw === "newest" || sortRaw === "length" ? sortRaw : "level";
  return { facets, search, sort };
}

export function queryToHash(q: { facets?: CatalogFacets; search?: string; sort?: SortMode }): string {
  const facetsPart = facetsToHash(q.facets ?? {});
  const params = facetsPart ? new URLSearchParams(facetsPart.slice(1)) : new URLSearchParams();
  if (q.search && q.search.trim()) {
    params.set("q", q.search.trim());
  }
  if (q.sort && q.sort !== "level") {
    params.set("sort", q.sort);
  }
  const qs = params.toString();
  return qs ? `#${qs}` : "";
}

export function sortEntries(entries: CatalogEntry[], mode: SortMode): CatalogEntry[] {
  const copy = [...entries];
  if (mode === "newest") {
    return copy.sort((a, b) => (b.dateAdded || "").localeCompare(a.dateAdded || ""));
  }
  if (mode === "length") {
    return copy.sort((a, b) => (b.minutes - a.minutes) || (a.title || "").localeCompare(b.title || ""));
  }
  // level (default): by band then title
  const bandOrder: Record<Band, number> = { A1: 0, A2: 1, B1: 2 };
  return copy.sort((a, b) => bandOrder[a.band] - bandOrder[b.band] || (a.title || "").localeCompare(b.title || ""));
}