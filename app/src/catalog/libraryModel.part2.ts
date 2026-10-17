import type { ReadingStatus, TopicKey } from "./libraryModel.part3.js";

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

const LIB_COPY = {
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

type LibCopyKey = keyof typeof LIB_COPY;

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
