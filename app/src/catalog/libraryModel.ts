
import type { WordStatus } from "@tsumugu/engine";
import { hasKnownWords, percentKnown, readingBand } from "./coverage.js";
import type { CatalogEntry } from "./types.js";

export type TopicKey = "food" | "family" | "city" | "travel" | "work" | "nature";
export type LibSort = "fit" | "new" | "short";
export type LibView = "gallery" | "table";
export type ReadingStatus = "in" | "stretch";


const KIND_FMT: Record<string, string> = {
  dialogue: "對話",
  story: "短文",
  explainer: "廣播",
  byo: "自訂",
};


export function formatLabel(entry: CatalogEntry): string {
  const title = entry.title ?? "";
  const idx = title.lastIndexOf("·");
  if (idx >= 0) {
    const suf = title.slice(idx + 1).trim().replace(/[一二三四五六七八九十百0-9]+$/u, "").trim();
    if (suf) return suf;
  }
  return KIND_FMT[entry.kind] ?? "短文";
}


export function descriptiveTitle(entry: CatalogEntry): string {
  const title = entry.title ?? entry.path;
  const idx = title.lastIndexOf("·");
  return (idx > 0 ? title.slice(0, idx) : title).trim() || title.trim();
}


export function bandNum(band: string): number {
  return band === "A1" ? 1 : band === "A2" ? 2 : band === "B1" ? 3 : 9;
}

const HAN_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];


export function hanNum(n: number): string {
  if (n < 0 || !Number.isFinite(n)) return String(n);
  if (n < 10) return HAN_DIGITS[n]!;
  if (n < 20) return n === 10 ? "十" : `十${HAN_DIGITS[n - 10]!}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${HAN_DIGITS[tens]!}十${ones ? HAN_DIGITS[ones]! : ""}`;
}

export interface TopicMeta {
  zh: string;
  en: string;
  vi: string;
  
  v: string;
}


export const TOPIC_META: Record<TopicKey, TopicMeta> = {
  food: { zh: "飲食", en: "Food & Markets", vi: "Ẩm thực & chợ", v: "var(--t-food)" },
  family: { zh: "家人", en: "Family & People", vi: "Gia đình & con người", v: "var(--t-family)" },
  city: { zh: "城市", en: "City Life", vi: "Đời sống thành phố", v: "var(--t-city)" },
  travel: { zh: "旅行", en: "Travel & Place", vi: "Du lịch & địa danh", v: "var(--t-travel)" },
  work: { zh: "工作", en: "Work & Study", vi: "Công việc & học tập", v: "var(--t-work)" },
  nature: { zh: "自然", en: "Nature & Seasons", vi: "Thiên nhiên & mùa", v: "var(--t-nature)" },
};

export const TOPIC_ORDER: TopicKey[] = ["food", "family", "city", "travel", "work", "nature"];


const TOPIC_ALIASES: Record<string, TopicKey> = {
  food: "food", "food-drink": "food", markets: "food", eating: "food",
  family: "family", people: "family", social: "family", relationships: "family",
  city: "city", "city-life": "city", "daily-life": "city", urban: "city", demo: "city",
  travel: "travel", place: "travel", places: "travel", tourism: "travel",
  work: "work", study: "work", school: "work", office: "work",
  nature: "nature", seasons: "nature", weather: "nature", outdoors: "nature",
  culture: "family",
};


const TOPIC_KEYWORDS: [TopicKey, RegExp][] = [
  ["food", /food|eating|diet|restaurant|market|shopping|飲食|購物/],
  ["family", /family|people|social|relationship|friend|introduc|appearance|sick|health|家庭|家人|人際|社交|生病|醫療/],
  ["travel", /travel|transport|direction|tourism|countryside|交通|旅行|問路/],
  ["work", /work|study|studying|school|educat|campus|internet|technolog|學習|工作|教育|校園|科技|網路/],
  ["nature", /nature|weather|season|climate|agricultur|天氣|氣候|農業|自然/],
];


export function normalizeTopic(topic?: string): TopicKey {
  if (!topic) return "city";
  const key = topic.trim().toLowerCase();
  const exact = TOPIC_ALIASES[key] ?? (TOPIC_ORDER.includes(key as TopicKey) ? (key as TopicKey) : null);
  if (exact) return exact;
  for (const [t, re] of TOPIC_KEYWORDS) if (re.test(key)) return t;
  return "city";
}


export const LIB_COPY = {
  continue: { en: "Continue", vi: "Tiếp tục" },
  resume: { en: "Resume →", vi: "Đọc tiếp →" },
  known: { en: "known", vi: "đã biết" },
  minLeft: { en: "left", vi: "còn lại" },
  forLevel: { en: "For my level", vi: "Đúng trình độ" },
  withAudio: { en: "🔊 With audio", vi: "🔊 Có âm thanh" },
  sort: { en: "Sort", vi: "Sắp xếp" },
  sortFit: { en: "Best fit", vi: "Phù hợp nhất" },
  sortNew: { en: "Newest", vi: "Mới nhất" },
  sortShort: { en: "Shortest", vi: "Ngắn nhất" },
  searchPh: { en: "Search title or word…", vi: "Tìm tên hoặc từ…" },
  searchAria: { en: "Search", vi: "Tìm kiếm" },
  gallery: { en: "Gallery", vi: "Lưới" },
  table: { en: "Table", vi: "Bảng" },
  allInterests: { en: "All interests", vi: "Tất cả chủ đề" },
  inYourBand: { en: "In your band", vi: "Trong trình độ của bạn" },
  newWords: { en: "New words", vi: "Từ mới" },
  new: { en: "new", vi: "mới" },
  min: { en: "min", vi: "phút" },
  readAff: { en: "Read →", vi: "Đọc →" },
  reading: { en: "reading", vi: "bài đọc" },
  readings: { en: "readings", vi: "bài đọc" },
  more: { en: "…", vi: "…" },
  coverage: { en: "coverage", vi: "phủ" },
  inRange: { en: "In range", vi: "Trong mức" },
  stretch: { en: "Stretch", vi: "Vượt mức" },
  emptyBand: {
    en: "No readings in this band. Turn off <b>For my level</b> or clear the search.",
    vi: "Không có bài trong trình độ này. Tắt <b>Đúng trình độ</b> hoặc xóa tìm kiếm.",
  },
  emptyFilter: { en: "No readings match this filter.", vi: "Không có bài khớp bộ lọc." },
  loading: { en: "Loading readings…", vi: "Đang tải bài đọc…" },
  emptyCatalog: {
    en: "No readings published yet. Check back soon.",
    vi: "Chưa có bài đọc nào. Hãy quay lại sau.",
  },
  noResults: { en: "Nothing matches your search.", vi: "Không có kết quả phù hợp." },
  view: { en: "View", vi: "Chế độ xem" },
  dictMatches: { en: "Dictionary matches", vi: "Kết quả từ điển" },
  dictMatchesNote: {
    en: "Full entries open in the dictionary.",
    vi: "Mục đầy đủ mở trong từ điển.",
  },
  dictOpen: { en: "Open in the dictionary (current rail)", vi: "Mở trong từ điển (đường ray hiện tại)" },
  thReading: { en: "Reading", vi: "Bài đọc" },
  thTopic: { en: "Topic", vi: "Chủ đề" },
  thLevel: { en: "Level", vi: "Trình độ" },
  thCoverage: { en: "Coverage", vi: "Độ phủ" },
  thNew: { en: "New", vi: "Mới" },
  thBinding: { en: "Binding", vi: "Giáo trình" },
  thLength: { en: "Length", vi: "Độ dài" },
  thAudio: { en: "Audio", vi: "Âm thanh" },
  thStatus: { en: "Status", vi: "Trạng thái" },
  clearFilters: { en: "Clear search & filters", vi: "Xóa tìm kiếm & bộ lọc" },
  demoBanner: {
    en: "Demo content — sample cards shown while the real catalog loads.",
    vi: "Nội dung mẫu — thẻ minh họa trong khi danh mục thật đang tải.",
  },
  note: {
    en: "Preview catalog. ~150 graded readings planned.",
    vi: "Danh mục xem trước. Dự kiến ~150 bài đọc theo cấp.",
  },
  
  
  masthead: { en: "", vi: "" },
  companion: { en: "Companion · 當代中文課程", vi: "Đồng hành · 當代中文課程" },
  booksRange: { en: "Books 1 to 5", vi: "Sách 1 đến 5" },
  lessonsWord: { en: "lessons", vi: "bài" },
  articlesWord: { en: "articles", vi: "bài" },
  articleWord: { en: "article", vi: "bài" },
  shelfNote: {
    en: "Each lesson: 3 articles; their union covers all lesson vocabulary and grammar.",
    vi: "Mỗi bài: 3 đoạn văn; hợp của chúng phủ toàn bộ từ vựng và ngữ pháp của bài.",
  },
  notYetPublished: { en: "Not yet published.", vi: "Chưa xuất bản." },
  catalog: { en: "Catalog", vi: "Mục lục" },
  sortHint: {
    en: "click a column header to sort (asc, desc, shelf order).",
    vi: "nhấp tiêu đề cột để sắp xếp (tăng, giảm, thứ tự kệ).",
  },
  colFirst: { en: "first line", vi: "câu đầu" },
  colLesson: { en: "lesson", vi: "bài" },
  colFormat: { en: "format", vi: "thể" },
  colBand: { en: "band", vi: "cấp" },
  colChars: { en: "chars", vi: "chữ" },
  colNew: { en: "new", vi: "mới" },
  cardStudies: { en: "Card studies · planned picture cards", vi: "Thẻ học · thẻ hình dự kiến" },
  cardStudiesFact: {
    en: "Planned. Cards return when readings carry pictures.",
    vi: "Dự kiến. Thẻ trở lại khi bài đọc có hình.",
  },
  read: { en: "已讀", vi: "已讀" },
  unread: { en: "未讀", vi: "未讀" },
  
  sortLesson: { en: "Lesson", vi: "Bài" },
  sortFormat: { en: "Format", vi: "Thể loại" },
  sortTitle: { en: "Title", vi: "Tên bài" },
  filterPh: { en: "Search titles", vi: "Tìm theo tên" },
  noMatches: { en: "No matches.", vi: "Không có kết quả." },
} as const;

export type LibCopyKey = keyof typeof LIB_COPY;

export function isViRail(root?: Element | null): boolean {
  const el = root ?? (typeof document !== "undefined" ? document.documentElement : null);
  return el?.getAttribute("data-rail") === "vi";
}

export function say(key: LibCopyKey, vi: boolean): string {
  const pair = LIB_COPY[key];
  return vi ? pair.vi : pair.en;
}


export interface ReadingRecord {
  path: string;
  zh: string;
  rom: string;
  romVi: string;
  topic: TopicKey;
  band: string;
  tocfl: string;
  bind: string;
  mins: number;
  audio: boolean;
  
  cov: number;
  
  covReal: boolean;
  newN: number;
  status: ReadingStatus;
  rec: boolean;
  
  added: number;
  
  nw: [string, string, string][];
  
  ex: string;
  
  fmt: string;
  
  len: number;
  
  book: number | null;
  lesson: number | null;
  
  descTitle: string;
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));


export function toReadingRecord(
  entry: CatalogEntry,
  getStatus: (lang: string, word: string) => WordStatus,
): ReadingRecord {
  const lang = entry.lang ?? "zh-Hant";
  const status1 = (w: string): WordStatus => getStatus(lang, w);
  const hasProgress = hasKnownWords(entry.wordCounts, status1);
  const covPct = hasProgress ? percentKnown(entry.wordCounts, entry.totalWords, status1) : null;
  const covReal = covPct != null;
  const cov = covPct != null
    ? Math.round(covPct)
    : clamp(100 - (entry.newWords ?? 0), 40, 99);
  const status: ReadingStatus = covPct != null && readingBand(covPct) === "stretch" ? "stretch" : "in";

  const nw: [string, string, string][] = entry.newWordSamples?.slice(0, 3)
    ?? Object.keys(entry.wordCounts ?? {}).slice(0, 3).map((w) => [w, "", ""] as [string, string, string]);

  const bind = entry.binding ? `ACCC B${entry.binding.book} L${entry.binding.lesson}` : "";

  return {
    path: entry.path,
    zh: entry.title ?? entry.path,
    rom: entry.titleRom ?? "",
    romVi: entry.titleRomVi ?? entry.titleRom ?? "",
    topic: normalizeTopic(entry.topic),
    band: entry.band,
    tocfl: `TOCFL ${entry.tocfl}`,
    bind,
    mins: entry.minutes ?? 0,
    audio: !!entry.hasAudio,
    cov,
    covReal,
    newN: entry.newWords ?? nw.length,
    status,
    rec: entry.recommended ?? (status === "in"),
    added: Date.parse(entry.dateAdded ?? "") || 0,
    nw,
    ex: entry.excerpt ?? "",
    fmt: formatLabel(entry),
    len: entry.totalWords ?? 0,
    book: entry.binding?.book ?? null,
    lesson: entry.binding?.lesson ?? null,
    descTitle: descriptiveTitle(entry),
  };
}


export interface LessonGroupRows {
  
  key: string;
  
  free: boolean;
  book: number | null;
  lesson: number | null;
  band: string;
  items: ReadingRecord[];
}

export function groupCatalogByLesson(records: ReadingRecord[]): LessonGroupRows[] {
  const groups = new Map<string, LessonGroupRows>();
  for (const r of records) {
    const bound = r.book != null && r.lesson != null;
    const key = bound ? `b${r.book}l${r.lesson}` : `free-${r.band}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, free: !bound, book: r.book, lesson: r.lesson, band: r.band, items: [] };
      groups.set(key, g);
    }
    g.items.push(r);
  }
  for (const g of groups.values()) g.items.sort((a, b) => a.path.localeCompare(b.path));
  return [...groups.values()].sort((a, b) => {
    if (a.free !== b.free) return a.free ? 1 : -1; 
    if (a.free) return bandNum(a.band) - bandNum(b.band);
    return (a.book! - b.book!) || (a.lesson! - b.lesson!);
  });
}


export interface LibState {
  topic: TopicKey | "all";
  forLevel: boolean;
  audio: boolean;
  sort: LibSort;
  view: LibView;
  q: string;
}

export function defaultLibState(): LibState {
  return { topic: "all", forLevel: true, audio: false, sort: "fit", view: "gallery", q: "" };
}

function haystack(r: ReadingRecord): string {
  return `${r.zh} ${r.rom} ${r.romVi} ${r.nw.map((w) => w.join(" ")).join(" ")}`.toLowerCase();
}


export function passRecord(r: ReadingRecord, state: LibState, ignoreTopic = false): boolean {
  if (state.audio && !r.audio) return false;
  if (state.forLevel && r.status === "stretch") return false;
  if (!ignoreTopic && state.topic !== "all" && r.topic !== state.topic) return false;
  return true;
}


export function matchesQuery(r: ReadingRecord, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return haystack(r).includes(needle);
}

export function sortRecords(list: ReadingRecord[], sort: LibSort): ReadingRecord[] {
  const copy = list.slice();
  return copy.sort((a, b) => {
    if (sort === "short") return a.mins - b.mins || b.cov - a.cov;
    if (sort === "new") return b.added - a.added;
    const ai = a.status === "in" ? 0 : 1;
    const bi = b.status === "in" ? 0 : 1;
    if (ai !== bi) return ai - bi;
    return b.cov - a.cov;
  });
}


export function rankRecords(list: ReadingRecord[], q: string, sort: LibSort = "fit"): ReadingRecord[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return sortRecords(list, sort);
  const tiered: { r: ReadingRecord; tier: number }[] = [];
  for (const r of list) {
    const titles = [r.zh, r.rom, r.romVi].map((t) => t.toLowerCase()).filter(Boolean);
    let tier = 0;
    if (titles.some((t) => t === needle)) tier = 3;
    else if (titles.some((t) => t.startsWith(needle))) tier = 2;
    else if (haystack(r).includes(needle)) tier = 1;
    if (tier > 0) tiered.push({ r, tier });
  }
  const bySort = new Map(sortRecords(list, sort).map((r, i) => [r.path, i]));
  return tiered
    .sort((a, b) => b.tier - a.tier || (bySort.get(a.r.path)! - bySort.get(b.r.path)!))
    .map((x) => x.r);
}


export function groupByTopic(list: ReadingRecord[]): { key: TopicKey; items: ReadingRecord[] }[] {
  return TOPIC_ORDER
    .map((key) => ({ key, items: list.filter((r) => r.topic === key) }))
    .filter((g) => g.items.length > 0);
}




function parseHash(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return raw ? new URLSearchParams(raw) : new URLSearchParams();
}

export function libStateFromHash(hash: string): LibState {
  const p = parseHash(hash);
  const s = defaultLibState();
  const lt = p.get("lt");
  if (lt && (lt === "all" || TOPIC_ORDER.includes(lt as TopicKey))) s.topic = lt as TopicKey | "all";
  if (p.get("lv") === "0") s.forLevel = false;
  if (p.get("la") === "1") s.audio = true;
  const ls = p.get("ls");
  if (ls === "new" || ls === "short" || ls === "fit") s.sort = ls;
  if (p.get("lw") === "table") s.view = "table";
  s.q = p.get("lq") ?? "";
  return s;
}


export function libStateToHash(state: LibState, baseHash = ""): string {
  const p = parseHash(baseHash);
  const set = (k: string, cond: boolean, v: string): void => {
    if (cond) p.set(k, v);
    else p.delete(k);
  };
  set("lt", state.topic !== "all", state.topic);
  set("lv", !state.forLevel, "0");
  set("la", state.audio, "1");
  set("ls", state.sort !== "fit", state.sort);
  set("lw", state.view !== "gallery", state.view);
  set("lq", !!state.q.trim(), state.q.trim());
  const qs = p.toString();
  return qs ? `#${qs}` : "";
}
