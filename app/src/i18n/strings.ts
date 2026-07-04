/**
 * Minimal i18n layer for account + auth surfaces (EN/VI).
 * UI lang comes from profile.uiLang or current rail/gloss preference.
 * All new account/login text MUST go through t() here.
 * Strings are paper-clean, no gamification.
 */

export type Locale = "en" | "vi";

export interface Strings {
  // Login / auth (magic-link keys removed 2026-07-02 with the simulated
  // magic-link flow — auth/session.ts keeps only devForceLogin)
  accountTitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  logout: string;
  loggedOut: string;

  // Profile
  profileTitle: string;
  displayName: string;
  railLabel: string;
  uiLangLabel: string;
  email: string;
  saveProfile: string;
  signOut: string;

  // Progress / stats
  progressTitle: string;
  knownCount: string;
  wordsThisWeek: string; // honest, no streak
  coverageTrend: string;
  noData: string;

  // Actions
  exportData: string;
  exportAnki: string;
  importVocab: string;
  deleteAccount: string;
  deleteConfirm: string;

  // Dev helpers (for testing merge)
  devTools: string;
  forceConflict: string;
  simulateOtherDevice: string;
  simulateOtherDeviceHint: string;

  // Merge / sync
  syncStatus: string;
  merged: string;
  conflictNote: string;
  offline: string;

  // Misc
  close: string;
  cancel: string;

  // Library
  libraryTitle: string;
  libraryContinue: string;
  libraryUpNext: string;
  libraryEmpty: string;
  librarySearch: string;

  // App shell chrome (nav, footer, rail)
  "brand.name": string;
  "brand.tag": string;
  "nav.home": string;
  "nav.library": string;
  "nav.grammar": string;
  "nav.flashcards": string;
  "nav.account": string;
  "nav.login": string;
  "nav.logout": string;
  "nav.continue": string;
  "nav.import": string;
  "nav.search": string;
  "nav.sync": string;
  "rail.label": string;
  "rail.en": string;
  "rail.vi": string;
  "settings.label": string;
  "auth.loggedOut": string;
  "footer.about": string;
  "footer.privacy": string;
  "footer.feedback": string;
  "footer.lang": string;
  "footer.colophon": string;
  "footer.method": string;

  // Homepage
  "home.hero.headline": string;
  "home.hero.subhead": string;
  "home.rail.chooser": string;
  "home.rail.viMoat": string;
  "home.rail.enNote": string;
  "home.sample.gloss": string;
  "home.sample.close": string;
  "home.value.read.title": string;
  "home.value.read.body": string;
  "home.value.bridge.title": string;
  "home.value.bridge.body": string;
  "home.value.bound.title": string;
  "home.value.bound.body": string;
  "home.cta.start": string;
  "home.cta.browse": string;
  "home.cta.login": string;
  "home.sample.title": string;
  "home.rail.btnVi": string;
  "home.rail.btnEn": string;

  // Settings UI
  "settings.theme": string;
  "settings.title": string;
  "settings.readingPrefs": string;
  "settings.knownState": string;
  "settings.knownStateHint": string;
  "settings.rubyScope": string;
  "settings.script": string;
  "settings.reading": string;
  "settings.gloss": string;
  "settings.palette": string;
  "settings.railDefault": string;
  "settings.uiLang": string;
  "settings.light": string;
  "settings.dark": string;

  // Catalog facets
  "facet.level": string;
  "facet.kind": string;
  "facet.sort": string;
  "facet.audio": string;
  "facet.search": string;
  "facet.hasAudio": string;
  "facet.topic": string;
  "facet.accc": string;
  "kind.story": string;
  "kind.dialogue": string;
  "kind.explainer": string;
  "kind.imported": string;
  "sort.level": string;
  "sort.newest": string;
  "sort.length": string;
  "catalog.coverage": string;
  "catalog.minutes": string;
  "catalog.rungCount": string;

  // Grammar
  "grammar.title": string;
  "grammar.hint": string;
  "grammar.empty": string;
  "grammar.search": string;
  "grammar.byLevel": string;
  "grammar.byTextbook": string;
  "grammar.readingsLink": string;

  // Flashcards
  "flashcards.title": string;
  "flashcards.note": string;
  "flashcards.coming": string;
  "flashcards.grading": string;
  "flashcards.useReader": string;
  "flashcards.goLibrary": string;
  "flashcards.openAccount": string;

  // Static pages
  "about.title": string;
  "about.body": string;
  "privacy.title": string;
  "privacy.body": string;
  "terms.title": string;
  "terms.body": string;
  "feedback.title": string;
  "feedback.body": string;
  "colophon.title": string;
  "colophon.body": string;
  "method.title": string;
  "method.body": string;

  // SEO (document title + meta description)
  "seo.home.title": string;
  "seo.home.description": string;
  "seo.library.title": string;
  "seo.library.description": string;
  "seo.grammar.title": string;
  "seo.grammar.description": string;
  "seo.flashcards.title": string;
  "seo.flashcards.description": string;
  "seo.account.title": string;
  "seo.account.description": string;
  "seo.reader.title": string;
  "seo.reader.description": string;
  "seo.about.title": string;
  "seo.about.description": string;
  "seo.privacy.title": string;
  "seo.privacy.description": string;
  "seo.terms.title": string;
  "seo.terms.description": string;
  "seo.feedback.title": string;
  "seo.feedback.description": string;
  "seo.colophon.title": string;
  "seo.colophon.description": string;
  "seo.method.title": string;
  "seo.method.description": string;

  // Surfaces
  "surface.home": string;
  "surface.library": string;
  "surface.grammar": string;
  "surface.flashcards": string;
  "surface.account": string;
  "surface.reader": string;

  // Phase 2 personal mechanical + polish (i18n full)
  "dashboard.title": string;
  "dashboard.hero": string;
  "dashboard.progress": string;
  "dashboard.library": string;
  "dashboard.digest": string;
  "dashboard.capture": string;
  "dashboard.health": string;
  "digest.title": string;
  "digest.strip": string;
  "morning.conductor": string;
  "gated.capture": string;
  "gated.stage": string;
  "gated.proceed": string;
  "library.health.scan": string;
  "library.health.ok": string;
  "library.health.issues": string;
  "error.generic": string;
  "loading.generic": string;
  "empty.generic": string;
  "a11y.skip": string;
  "toast.firstGrade": string;
  "perf.note": string;
  "metrics.event": string;
  "reverse.links": string;
  "embed.stub": string;
  "theme.experiment": string;
  "sync.delta": string;

  // Sync panel (gated behind VITE_FEATURE_SYNC; strings live here so the panel
  // ships bilingual the moment the flag turns on)
  "sync.title": string;
  "sync.intro": string;
  "sync.fileTitle": string;
  "sync.exportFile": string;
  "sync.share": string;
  "sync.importFile": string;
  "sync.drop": string;
  "sync.exported": string;
  "sync.shared": string;
  "sync.shareUnsupported": string;
  "sync.shareCancelled": string;
  "sync.importedMerged": string;
  "sync.importedMergedConflict": string;
  "sync.importFailed": string;
  "sync.failed": string;
  "sync.codeTitle": string;
  "sync.codeOutPh": string;
  "sync.generate": string;
  "sync.copied": string;
  "sync.generated": string;
  "sync.codeInPh": string;
  "sync.apply": string;
  "sync.pasteFirst": string;
  "sync.applyFailed": string;
  "sync.merged": string;
  "sync.pullTitle": string;
  "sync.pullHint": string;
  "sync.pull": string;
  "sync.enterUrl": string;
  "sync.pulling": string;
  "sync.pullFailed": string;
  "sync.ankiTitle": string;
  "sync.exportApkg": string;
  "sync.deckExported": string;
  "sync.ankiFailed": string;
}

const EN: Strings = {
  accountTitle: "Account",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  logout: "Log out",
  loggedOut: "Logged out",

  profileTitle: "Profile",
  displayName: "Display name",
  railLabel: "Default rail",
  uiLangLabel: "UI language",
  email: "Email",
  saveProfile: "Save profile",
  signOut: "Sign out",

  progressTitle: "Progress",
  knownCount: "Known / learned words",
  wordsThisWeek: "Words learned this week (honest count)",
  coverageTrend: "Coverage trend",
  noData: "No data yet.",

  exportData: "Export my data (JSON)",
  exportAnki: "Export Anki deck",
  importVocab: "Import vocab (seed known words)",
  deleteAccount: "Delete my account",
  deleteConfirm: "This will clear your server data and local cache. Continue?",

  devTools: "Dev tools (demo sync)",
  forceConflict: "Force a conflict on a sample word",
  simulateOtherDevice: "Simulate login from another device + change",
  simulateOtherDeviceHint: "Edits the simulated remote directly, then you can login to trigger merge.",

  syncStatus: "Sync",
  merged: "Merged from server",
  conflictNote: "Some words had clock conflicts (resolved by policy).",
  offline: "Offline (changes queued)",

  close: "Close",
  cancel: "Cancel",

  // Library (content browser)
  libraryTitle: "Library",
  libraryContinue: "Continue reading",
  libraryUpNext: "Up next at your level",
  libraryEmpty: "No readings match your filters.",
  librarySearch: "Search titles or topics…",

  // Shell (EN)
  "brand.name": "Tsumugu",
  "brand.tag": "Beta",
  "nav.home": "Home",
  "nav.library": "Library",
  "nav.grammar": "Grammar",
  "nav.flashcards": "Flashcards",
  "nav.account": "Account",
  "nav.login": "Log in",
  "nav.logout": "Log out",
  "nav.continue": "Continue",
  "nav.import": "Import text",
  "nav.search": "Search",
  "nav.sync": "Sync",
  "rail.label": "Rail",
  "rail.en": "EN 英",
  "rail.vi": "VI 越",
  "settings.label": "Theme",
  "auth.loggedOut": "Log in",
  "footer.about": "About",
  "footer.privacy": "Privacy",
  "footer.feedback": "Feedback",
  "footer.lang": "Language",
  "footer.colophon": "Colophon",
  "footer.method": "Method",

  "home.hero.headline": "Read real Chinese at your level.",
  "home.hero.subhead": "Two rails run over the same text. Read with an English gloss, or with Vietnamese and the cognate bridge.",
  "home.rail.chooser": "Which rail are you reading on?",
  "home.rail.viMoat": "+ cognate bridge",
  "home.rail.enNote": "Plain-English gloss on every word.",
  "home.sample.gloss": "to gaze into the distance; to look toward",
  "home.sample.close": "the same 望 vọng you already say every day",
  "home.value.read.title": "Read at your level",
  "home.value.read.body": "Graded readings bound to the textbook. You read at a level you can follow.",
  "home.value.bridge.title": "The cognate bridge",
  "home.value.bridge.body": "The Vietnamese rail shows the Hán-Việt morphemes you already speak.",
  "home.value.bound.title": "Tied to your textbook",
  "home.value.bound.body": "ACCC lessons surface the vocabulary and grammar you are studying.",
  "home.cta.start": "Start reading",
  "home.cta.browse": "Browse the library",
  "home.cta.login": "Log in",
  "home.sample.title": "Live sample. Tap the underlined word.",
  "home.rail.btnVi": "tôi học tiếng Trung bằng tiếng Việt",
  "home.rail.btnEn": "I'm learning Chinese in English",

  "settings.theme": "Light / dark",
  "settings.title": "Settings",
  "settings.readingPrefs": "Reading preferences",
  "settings.knownState": "Known-word coloring",
  "settings.knownStateHint": "Show your known / learning / new underlines while reading.",
  "settings.rubyScope": "Ruby & gloss",
  "settings.script": "Script",
  "settings.reading": "Reading",
  "settings.gloss": "Gloss",
  "settings.palette": "Palette",
  "settings.railDefault": "Default rail",
  "settings.uiLang": "UI language",
  "settings.light": "Light",
  "settings.dark": "Dark",

  "facet.level": "Level",
  "facet.kind": "Kind",
  "facet.sort": "Sort",
  "facet.audio": "Audio",
  "facet.search": "Search",
  "facet.hasAudio": "has audio",
  "facet.topic": "Topic",
  "facet.accc": "ACCC",
  "kind.story": "story",
  "kind.dialogue": "dialogue",
  "kind.explainer": "explainer",
  "kind.imported": "imported",
  "sort.level": "level",
  "sort.newest": "newest",
  "sort.length": "length",
  "catalog.coverage": "you know ~{pct}%",
  "catalog.minutes": "~{n} min",
  "catalog.rungCount": "{n} readings at your level",

  "grammar.title": "Grammar",
  "grammar.hint": "Original explanations derived from the textbook index. Tap a point to see examples.",
  "grammar.empty": "No points match.",
  "grammar.search": "Search grammar points…",
  "grammar.byLevel": "By level",
  "grammar.byTextbook": "By textbook",
  "grammar.readingsLink": "See readings with this point →",

  "flashcards.title": "Flashcards",
  "flashcards.note": "Review (fast-follow). Engine FSRS + context cards are ready; surface is intentionally minimal to avoid creating review debt.",
  "flashcards.coming": "A later release adds a band-ranked queue of learning words. Front is your captured context sentence; back is reading, gloss, and the bridge on the VI rail.",
  "flashcards.grading": "Grading (again / hard / good / easy) will feed the built-in FSRS. You can also export Anki from Account.",
  "flashcards.useReader": "For now, use the reader to mark words and the Library to find more at your level.",
  "flashcards.goLibrary": "Go to Library",
  "flashcards.openAccount": "Open Account (export)",

  "about.title": "About Tsumugu Beta",
  "about.body": "<p>Tsumugu Beta is a graded reader for Traditional Chinese. Every reading runs two rails over the same text. The English rail carries a plain gloss on each word. The Vietnamese rail carries the gloss plus the Hán-Việt cognate bridge.</p><p>You read at a level you can follow. Tap a word to see its reading and gloss. On the Vietnamese rail, a tapped word also shows the shared Hán-Việt morphemes you already speak.</p>",
  "privacy.title": "Privacy",
  "privacy.body": "<p>Tsumugu Beta runs in your browser. There are no accounts and no cookies. Your known words, your settings, and any text you paste stay in this browser's local storage on this device. Clearing your browser storage removes them.</p><p>Fonts are served from this site; no third-party font service is called. The public site counts page views and feature use with cookieless aggregate analytics; the counts identify no one.</p>",
  "terms.title": "Terms",
  "terms.body": "<p>Tsumugu Beta is provided as is, free of charge, with no warranty of any kind. Content and features may change or pause during the beta.</p><p>The readings, titles, and dictionary data on this site are original works, \u00a9 Tsumugu, all rights reserved. They are here to read, not to republish.</p><p>Text you paste into the reader stays in your browser and is your responsibility; paste only what you have the right to read.</p>",
  "feedback.title": "Feedback",
  "feedback.body": "<p>Send a note about a bug, a confusing reading, or a wrong gloss. This preview is built for reading-first feedback from English and Vietnamese learners.</p>",
  "colophon.title": "Colophon",
  "colophon.body": "<p>Type is Inter for the interface and LXGW WenKai TC for Chinese text, served from this site. One spectral-teal accent on cool neutrals. Both rails are generated with each reading and shipped as static files. Known-word state is stored locally.</p><p>The readings are AI-authored originals, written for this site and reviewed before publishing.</p><p>Tsumugu is an independent project, not affiliated with or endorsed by National Taiwan Normal University or its Mandarin Training Center; 當代中文課程 lesson numbers appear as compatibility references only.</p><p>\u00a9 Tsumugu. All rights reserved.</p>",
  "method.title": "Method",
  "method.body": "<p>Read extensively at your level. Tap a word to see its reading and gloss. On the Vietnamese rail, the tap also opens the cognate bridge, which shows the shared Hán-Việt morpheme across related words.</p><p>Word status shows as an underline. The Seal-Red accent is reserved for the brand, the bridge, and the confirm-known action. Both rails are baked in when a reading is generated.</p>",

  "seo.home.title": "Tsumugu Beta · Read Traditional Chinese",
  "seo.home.description": "Graded readings for Traditional Chinese. EN or VI rail with ruby and the cognate bridge.",
  "seo.library.title": "Library · Tsumugu Beta",
  "seo.library.description": "Browse graded Traditional Chinese readings by level, topic, and textbook binding.",
  "seo.grammar.title": "Grammar · Tsumugu Beta",
  "seo.grammar.description": "Original grammar explanations tied to textbook lessons and graded readings.",
  "seo.flashcards.title": "Flashcards · Tsumugu Beta",
  "seo.flashcards.description": "Light optional review of learning words. Reading-first; export to Anki anytime.",
  "seo.account.title": "Account · Tsumugu Beta",
  "seo.account.description": "Sync known words, export data, and manage your learner profile.",
  "seo.reader.title": "Reading · Tsumugu Beta",
  "seo.reader.description": "Read graded Traditional Chinese with tap-to-gloss and known-word coloring.",
  "seo.about.title": "About · Tsumugu Beta",
  "seo.about.description": "Graded Traditional Chinese reader with EN and VI rails.",
  "seo.privacy.title": "Privacy · Tsumugu Beta",
  "seo.privacy.description": "No accounts, no cookies. Your known words and text stay in this browser; the site keeps only cookieless aggregate counts.",
  "seo.terms.title": "Terms · Tsumugu Beta",
  "seo.terms.description": "Terms of use for Tsumugu Beta.",
  "seo.feedback.title": "Feedback · Tsumugu Beta",
  "seo.feedback.description": "Send thoughts, bugs, or content issues for the Tsumugu Beta preview.",
  "seo.colophon.title": "Colophon · Tsumugu Beta",
  "seo.colophon.description": "Design, tokens, House layout, branding for Tsumugu Beta.",
  "seo.method.title": "Method · Tsumugu Beta",
  "seo.method.description": "How to read: rails, bridge, underline status, the Seal-Red accent.",

  "surface.home": "Home",
  "surface.library": "Library",
  "surface.grammar": "Grammar",
  "surface.flashcards": "Flashcards",
  "surface.account": "Account",
  "surface.reader": "Reading",

  // Phase 2 personal mechanical + polish (i18n full)
  "dashboard.title": "Personal Dashboard",
  "dashboard.hero": "Focus • Coverage • Next",
  "dashboard.progress": "Your progress",
  "dashboard.library": "Library at a glance",
  "dashboard.digest": "Daily digest",
  "dashboard.capture": "Gated capture",
  "dashboard.health": "Library health",
  "digest.title": "Daily thin strip",
  "digest.strip": "Recent readings + backlog + open Qs",
  "morning.conductor": "Morning Conductor",
  "gated.capture": "Capture (gated)",
  "gated.stage": "Stage for review",
  "gated.proceed": "Proceed to vault",
  "library.health.scan": "Scan library",
  "library.health.ok": "All clear",
  "library.health.issues": "Issues found",
  "error.generic": "Something went wrong. Try again.",
  "loading.generic": "Loading…",
  "empty.generic": "Nothing here yet.",
  "a11y.skip": "Skip to content",
  "toast.firstGrade": "Saved on this device.",
  "perf.note": "Lazy loaded for perf",
  "metrics.event": "Event",
  "reverse.links": "Used in readings",
  "embed.stub": "Embed preview",
  "theme.experiment": "Theme exp",
  "sync.delta": "Delta sync (WordEntry only)",

  "sync.title": "Sync",
  "sync.intro": "Local-only. Nothing leaves this device unless you export it. No account, no server, no personal information.",
  "sync.fileTitle": "File",
  "sync.exportFile": "Export file",
  "sync.share": "Share…",
  "sync.importFile": "Import file",
  "sync.drop": "…or drop a .json export here",
  "sync.exported": "Exported.",
  "sync.shared": "Shared.",
  "sync.shareUnsupported": "Sharing is not supported here. Use Export file.",
  "sync.shareCancelled": "Share cancelled.",
  "sync.importedMerged": "Imported and merged. {n} words touched.",
  "sync.importedMergedConflict": "Imported and merged (conflicts resolved, never demoting). {n} words touched.",
  "sync.importFailed": "Import failed",
  "sync.failed": "Failed",
  "sync.codeTitle": "Sync code (copy / paste)",
  "sync.codeOutPh": "Your sync code appears here.",
  "sync.generate": "Generate code",
  "sync.copied": "Copied to clipboard.",
  "sync.generated": "Generated. Select and copy.",
  "sync.codeInPh": "Paste a sync code from another device, then Apply.",
  "sync.apply": "Apply code",
  "sync.pasteFirst": "Paste a code first.",
  "sync.applyFailed": "Apply failed",
  "sync.merged": "Merged. {n} words touched.",
  "sync.pullTitle": "Pull from a URL",
  "sync.pullHint": "Paste a URL that serves your exported JSON (gist raw, object storage…). Pull only adds words; it never demotes. Writes stay manual (export or sync code).",
  "sync.pull": "Pull + merge",
  "sync.enterUrl": "Enter a URL.",
  "sync.pulling": "Pulling…",
  "sync.pullFailed": "Pull failed",
  "sync.ankiTitle": "Anki",
  "sync.exportApkg": "Export .apkg",
  "sync.deckExported": "Deck exported.",
  "sync.ankiFailed": "Anki export failed. Use file export for full data.",
};

const VI: Strings = {
  accountTitle: "Tài khoản",
  emailLabel: "Email",
  emailPlaceholder: "ban@example.com",
  logout: "Đăng xuất",
  loggedOut: "Đã đăng xuất",

  profileTitle: "Hồ sơ",
  displayName: "Tên hiển thị",
  railLabel: "Ray mặc định",
  uiLangLabel: "Ngôn ngữ giao diện",
  email: "Email",
  saveProfile: "Lưu hồ sơ",
  signOut: "Đăng xuất",

  progressTitle: "Tiến độ",
  knownCount: "Số từ đã biết / đã học",
  wordsThisWeek: "Từ học trong tuần (đếm thực)",
  coverageTrend: "Xu hướng bao phủ",
  noData: "Chưa có dữ liệu.",

  exportData: "Xuất dữ liệu của tôi (JSON)",
  exportAnki: "Xuất bộ Anki",
  importVocab: "Nhập từ vựng (gieo từ đã biết)",
  deleteAccount: "Xóa tài khoản của tôi",
  deleteConfirm: "Thao tác này sẽ xóa dữ liệu server và bộ nhớ cục bộ. Tiếp tục?",

  devTools: "Công cụ dev (demo đồng bộ)",
  forceConflict: "Tạo xung đột trên từ mẫu",
  simulateOtherDevice: "Mô phỏng đăng nhập từ thiết bị khác + thay đổi",
  simulateOtherDeviceHint: "Sửa trực tiếp remote mô phỏng, sau đó đăng nhập để kích hoạt merge.",

  syncStatus: "Đồng bộ",
  merged: "Đã gộp từ server",
  conflictNote: "Một số từ có xung đột đồng hồ (đã giải bằng chính sách).",
  offline: "Ngoại tuyến (thay đổi đang chờ)",

  close: "Đóng",
  cancel: "Hủy",

  // Library (content browser)
  libraryTitle: "Thư viện",
  libraryContinue: "Tiếp tục đọc",
  libraryUpNext: "Phù hợp tiếp theo",
  libraryEmpty: "Không có bài đọc phù hợp với bộ lọc.",
  librarySearch: "Tìm theo tiêu đề hoặc chủ đề…",

  // Shell (VI)
  "brand.name": "Tsumugu",
  "brand.tag": "Beta",
  "nav.home": "Trang chủ",
  "nav.library": "Thư viện",
  "nav.grammar": "Ngữ pháp",
  "nav.flashcards": "Thẻ ghi nhớ",
  "nav.account": "Tài khoản",
  "nav.login": "Đăng nhập",
  "nav.logout": "Đăng xuất",
  "nav.continue": "Đọc tiếp",
  "nav.import": "Nhập văn bản",
  "nav.search": "Tìm kiếm",
  "nav.sync": "Đồng bộ",
  "rail.label": "Đường ray",
  "rail.en": "EN 英",
  "rail.vi": "VI 越",
  "settings.label": "Giao diện",
  "auth.loggedOut": "Đăng nhập",
  "footer.about": "Giới thiệu",
  "footer.privacy": "Quyền riêng tư",
  "footer.feedback": "Phản hồi",
  "footer.lang": "Ngôn ngữ",
  "footer.colophon": "Colophon",
  "footer.method": "Phương pháp",

  "home.hero.headline": "Đọc tiếng Trung thật ở trình độ của bạn.",
  "home.hero.subhead": "Hai đường ray chạy trên cùng một văn bản. Đọc với chú thích tiếng Anh, hoặc với tiếng Việt kèm cầu nối đồng nguyên.",
  "home.rail.chooser": "Bạn đọc trên đường ray nào?",
  "home.rail.viMoat": "+ cầu nối đồng nguyên",
  "home.rail.enNote": "Chú thích tiếng Anh cho mọi từ.",
  "home.sample.gloss": "nhìn ra xa; ngóng trông",
  "home.sample.close": "cùng chữ 望 vọng bạn nói mỗi ngày",
  "home.value.read.title": "Đọc đúng trình độ",
  "home.value.read.body": "Bài đọc phân cấp gắn với giáo trình. Bạn đọc ở mức mình theo được.",
  "home.value.bridge.title": "Cầu nối từ đồng nguyên",
  "home.value.bridge.body": "Đường ray tiếng Việt hiển thị các từ tố Hán-Việt bạn đã nói.",
  "home.value.bound.title": "Gắn với giáo trình",
  "home.value.bound.body": "Bài học ACCC đưa ra từ vựng và ngữ pháp bạn đang học.",
  "home.cta.start": "Bắt đầu đọc",
  "home.cta.browse": "Duyệt thư viện",
  "home.cta.login": "Đăng nhập",
  "home.sample.title": "Ví dụ trực tiếp. Chạm vào từ được gạch chân.",
  "home.rail.btnVi": "tôi học tiếng Trung bằng tiếng Việt",
  "home.rail.btnEn": "I'm learning Chinese in English",

  "settings.theme": "Sáng / tối",
  "settings.title": "Cài đặt",
  "settings.readingPrefs": "Tùy chọn đọc",
  "settings.knownState": "Tô màu từ đã biết",
  "settings.knownStateHint": "Hiển thị gạch chân đã biết / đang học / mới khi đọc.",
  "settings.rubyScope": "Ruby & chú thích",
  "settings.script": "Chữ",
  "settings.reading": "Âm đọc",
  "settings.gloss": "Nghĩa",
  "settings.palette": "Bảng màu",
  "settings.railDefault": "Đường ray mặc định",
  "settings.uiLang": "Ngôn ngữ giao diện",
  "settings.light": "Sáng",
  "settings.dark": "Tối",

  "facet.level": "Trình độ",
  "facet.kind": "Loại",
  "facet.sort": "Sắp xếp",
  "facet.audio": "Âm thanh",
  "facet.search": "Tìm kiếm",
  "facet.hasAudio": "có âm thanh",
  "facet.topic": "Chủ đề",
  "facet.accc": "ACCC",
  "kind.story": "truyện",
  "kind.dialogue": "hội thoại",
  "kind.explainer": "giải thích",
  "kind.imported": "nhập",
  "sort.level": "trình độ",
  "sort.newest": "mới nhất",
  "sort.length": "độ dài",
  "catalog.coverage": "bạn biết ~{pct}%",
  "catalog.minutes": "~{n} phút",
  "catalog.rungCount": "{n} bài ở trình độ của bạn",

  "grammar.title": "Ngữ pháp",
  "grammar.hint": "Giải thích gốc dẫn xuất từ chỉ mục giáo trình. Chạm điểm ngữ pháp để xem ví dụ.",
  "grammar.empty": "Không có điểm phù hợp.",
  "grammar.search": "Tìm điểm ngữ pháp…",
  "grammar.byLevel": "Theo trình độ",
  "grammar.byTextbook": "Theo giáo trình",
  "grammar.readingsLink": "Xem bài đọc có điểm này →",

  "flashcards.title": "Thẻ ghi nhớ",
  "flashcards.note": "Ôn tập (sắp có). FSRS + thẻ ngữ cảnh đã sẵn sàng; giao diện cố ý tối giản để không tạo nợ ôn tập.",
  "flashcards.coming": "Một bản sau sẽ thêm hàng đợi từ đang học theo band. Mặt trước là câu ngữ cảnh bạn đã gặp; mặt sau là âm đọc, nghĩa, và cầu nối trên đường ray VI.",
  "flashcards.grading": "Chấm điểm (lại / khó / tốt / dễ) sẽ cập nhật FSRS. Bạn cũng có thể xuất Anki từ Tài khoản.",
  "flashcards.useReader": "Hiện tại, dùng trình đọc để đánh dấu từ và Thư viện để tìm bài phù hợp trình độ.",
  "flashcards.goLibrary": "Đến Thư viện",
  "flashcards.openAccount": "Mở Tài khoản (xuất)",

  "about.title": "Giới thiệu Tsumugu Beta",
  "about.body": "<p>Tsumugu Beta là trình đọc phân cấp cho tiếng Trung phồn thể. Mỗi bài đọc chạy hai đường ray trên cùng một văn bản. Đường ray tiếng Anh mang chú thích ngắn cho từng từ. Đường ray tiếng Việt mang chú thích cùng cầu nối đồng nguyên Hán-Việt.</p><p>Bạn đọc ở mức mình theo được. Chạm một từ để xem âm đọc và nghĩa. Trên đường ray tiếng Việt, từ được chạm còn hiện các từ tố Hán-Việt chung mà bạn đã nói.</p>",
  "privacy.title": "Quyền riêng tư",
  "privacy.body": "<p>Tsumugu Beta chạy trong trình duyệt của bạn. Không có tài khoản và không có cookie. Từ đã biết, cài đặt, và bất kỳ văn bản nào bạn dán đều nằm trong bộ nhớ cục bộ của trình duyệt trên thiết bị này. Xóa bộ nhớ trình duyệt sẽ xóa chúng.</p><p>Phông chữ được phục vụ từ chính trang này; không gọi dịch vụ phông chữ bên thứ ba. Trang công khai đếm lượt xem trang và lượt dùng tính năng bằng thống kê tổng hợp không cookie; số liệu không nhận diện ai.</p>",
  "terms.title": "Điều khoản",
  "terms.body": "<p>Tsumugu Beta được cung cấp nguyên trạng, miễn phí, không kèm bảo đảm nào. Nội dung và tính năng có thể thay đổi hoặc tạm dừng trong giai đoạn beta.</p><p>Các bài đọc, tên bài, và dữ liệu từ điển trên trang này là tác phẩm nguyên tác, \u00a9 Tsumugu, giữ mọi quyền. Chúng ở đây để đọc, không phải để đăng lại.</p><p>Văn bản bạn dán vào trình đọc nằm trong trình duyệt của bạn và thuộc trách nhiệm của bạn; chỉ dán những gì bạn có quyền đọc.</p>",
  "feedback.title": "Phản hồi",
  "feedback.body": "<p>Gửi một ghi chú về lỗi, một bài đọc khó hiểu, hoặc một chú thích sai. Bản xem trước này được xây cho phản hồi ưu tiên việc đọc từ người học tiếng Anh và tiếng Việt.</p>",
  "colophon.title": "Ấn bản",
  "colophon.body": "<p>Phông chữ là Inter cho giao diện và LXGW WenKai TC cho chữ Hán, phục vụ từ chính trang này. Một màu nhấn xanh mòng két trên nền trung tính. Hai đường ray được tạo cùng mỗi bài đọc và xuất dưới dạng tệp tĩnh. Trạng thái từ đã biết lưu cục bộ.</p><p>Các bài đọc là nguyên tác do AI viết cho trang này và được duyệt trước khi đăng.</p><p>Tsumugu là dự án độc lập, không liên kết hay được bảo trợ bởi Đại học Sư phạm Quốc gia Đài Loan hay Trung tâm Đào tạo Hoa ngữ (MTC); số bài 當代中文課程 chỉ là tham chiếu tương thích.</p><p>\u00a9 Tsumugu. Giữ mọi quyền.</p>",
  "method.title": "Phương pháp",
  "method.body": "<p>Đọc nhiều ở trình độ của bạn. Chạm một từ để xem âm đọc và nghĩa. Trên đường ray tiếng Việt, cú chạm còn mở cầu nối đồng nguyên, hiện từ tố Hán-Việt chung giữa các từ liên quan.</p><p>Trạng thái từ hiện bằng gạch chân. Màu Seal-Red dành cho thương hiệu, cầu nối, và thao tác xác nhận đã biết. Cả hai đường ray được dựng sẵn khi tạo bài đọc.</p>",

  "seo.home.title": "Tsumugu Beta · Đọc tiếng Trung phồn thể",
  "seo.home.description": "Bài đọc phân cấp tiếng Trung phồn thể. Đường ray EN hoặc VI với ruby và cầu nối từ đồng gốc.",
  "seo.library.title": "Thư viện · Tsumugu Beta",
  "seo.library.description": "Duyệt bài đọc phân cấp theo trình độ, chủ đề và giáo trình.",
  "seo.grammar.title": "Ngữ pháp · Tsumugu Beta",
  "seo.grammar.description": "Giải thích ngữ pháp gốc gắn bài học giáo trình và bài đọc phân cấp.",
  "seo.flashcards.title": "Thẻ ghi nhớ · Tsumugu Beta",
  "seo.flashcards.description": "Ôn tập nhẹ tùy chọn. Đọc trước; xuất Anki bất cứ lúc nào.",
  "seo.account.title": "Tài khoản · Tsumugu Beta",
  "seo.account.description": "Đồng bộ từ đã biết, xuất dữ liệu và quản lý hồ sơ học.",
  "seo.reader.title": "Đọc · Tsumugu Beta",
  "seo.reader.description": "Đọc tiếng Trung phồn thể phân cấp với chạm-xem-nghĩa và tô màu từ đã biết.",
  "seo.about.title": "Giới thiệu · Tsumugu Beta",
  "seo.about.description": "Trình đọc tiếng Trung phồn thể phân cấp với đường ray EN và VI.",
  "seo.privacy.title": "Quyền riêng tư · Tsumugu Beta",
  "seo.privacy.description": "Không tài khoản, không cookie. Từ đã biết và văn bản nằm trong trình duyệt này; trang chỉ giữ số liệu tổng hợp không cookie.",
  "seo.terms.title": "Điều khoản · Tsumugu Beta",
  "seo.terms.description": "Điều khoản sử dụng của Tsumugu Beta.",
  "seo.feedback.title": "Phản hồi · Tsumugu Beta",
  "seo.feedback.description": "Gửi ý kiến, lỗi hoặc vấn đề nội dung cho bản xem trước Tsumugu Beta.",
  "seo.colophon.title": "Colophon · Tsumugu Beta",
  "seo.colophon.description": "Thiết kế, tokens, bố cục House, branding cho Tsumugu Beta.",
  "seo.method.title": "Phương pháp · Tsumugu Beta",
  "seo.method.description": "Cách đọc: ray, cầu nối, gạch chân trạng thái, màu đỏ ấn.",

  "surface.home": "Trang chủ",
  "surface.library": "Thư viện",
  "surface.grammar": "Ngữ pháp",
  "surface.flashcards": "Thẻ ghi nhớ",
  "surface.account": "Tài khoản",
  "surface.reader": "Đọc",

  // Phase 2 personal mechanical + polish (i18n full)
  "dashboard.title": "Bảng điều khiển cá nhân",
  "dashboard.hero": "Tập trung • Bao phủ • Tiếp theo",
  "dashboard.progress": "Tiến độ của bạn",
  "dashboard.library": "Thư viện nhìn qua",
  "dashboard.digest": "Tóm tắt hàng ngày",
  "dashboard.capture": "Ghi nhận có cổng",
  "dashboard.health": "Sức khỏe thư viện",
  "digest.title": "Dải mỏng hàng ngày",
  "digest.strip": "Bài gần đây + backlog + câu hỏi mở",
  "morning.conductor": "Morning Conductor",
  "gated.capture": "Ghi nhận (có cổng)",
  "gated.stage": "Đưa vào chờ duyệt",
  "gated.proceed": "Tiến hành vào vault",
  "library.health.scan": "Quét thư viện",
  "library.health.ok": "Tất cả ổn",
  "library.health.issues": "Có vấn đề",
  "error.generic": "Đã xảy ra lỗi. Thử lại.",
  "loading.generic": "Đang tải…",
  "empty.generic": "Chưa có gì ở đây.",
  "a11y.skip": "Bỏ qua đến nội dung",
  "toast.firstGrade": "Đã lưu trên thiết bị này.",
  "perf.note": "Tải lười cho hiệu năng",
  "metrics.event": "Sự kiện",
  "reverse.links": "Dùng trong bài đọc",
  "embed.stub": "Xem trước nhúng",
  "theme.experiment": "Thử nghiệm chủ đề",
  "sync.delta": "Đồng bộ delta (chỉ WordEntry)",

  "sync.title": "Đồng bộ",
  "sync.intro": "Chỉ cục bộ. Không gì rời thiết bị này trừ khi bạn xuất nó. Không tài khoản, không máy chủ, không thông tin cá nhân.",
  "sync.fileTitle": "Tệp",
  "sync.exportFile": "Xuất tệp",
  "sync.share": "Chia sẻ…",
  "sync.importFile": "Nhập tệp",
  "sync.drop": "…hoặc thả tệp .json đã xuất vào đây",
  "sync.exported": "Đã xuất.",
  "sync.shared": "Đã chia sẻ.",
  "sync.shareUnsupported": "Không hỗ trợ chia sẻ ở đây. Dùng Xuất tệp.",
  "sync.shareCancelled": "Đã hủy chia sẻ.",
  "sync.importedMerged": "Đã nhập và gộp. {n} từ được cập nhật.",
  "sync.importedMergedConflict": "Đã nhập và gộp (xung đột được giải, không hạ bậc). {n} từ được cập nhật.",
  "sync.importFailed": "Nhập thất bại",
  "sync.failed": "Thất bại",
  "sync.codeTitle": "Mã đồng bộ (sao chép / dán)",
  "sync.codeOutPh": "Mã đồng bộ của bạn hiện ở đây.",
  "sync.generate": "Tạo mã",
  "sync.copied": "Đã sao chép.",
  "sync.generated": "Đã tạo. Chọn và sao chép.",
  "sync.codeInPh": "Dán mã đồng bộ từ thiết bị khác, rồi bấm Áp dụng.",
  "sync.apply": "Áp dụng mã",
  "sync.pasteFirst": "Dán mã trước.",
  "sync.applyFailed": "Áp dụng thất bại",
  "sync.merged": "Đã gộp. {n} từ được cập nhật.",
  "sync.pullTitle": "Kéo từ URL",
  "sync.pullHint": "Dán URL trả về tệp JSON bạn đã xuất (gist raw, object storage…). Kéo chỉ thêm từ; không bao giờ hạ bậc. Ghi vẫn thủ công (xuất tệp hoặc mã đồng bộ).",
  "sync.pull": "Kéo + gộp",
  "sync.enterUrl": "Nhập URL.",
  "sync.pulling": "Đang kéo…",
  "sync.pullFailed": "Kéo thất bại",
  "sync.ankiTitle": "Anki",
  "sync.exportApkg": "Xuất .apkg",
  "sync.deckExported": "Đã xuất bộ thẻ.",
  "sync.ankiFailed": "Xuất Anki thất bại. Dùng xuất tệp để có đủ dữ liệu.",
};

const all: Record<Locale, any> = { en: EN, vi: VI };

export function getLocale(uiLang: Locale | string | undefined): Locale {
  return uiLang === "vi" ? "vi" : "en";
}

export function t(locale: Locale, key: keyof Strings): string {
  return all[locale]?.[key] ?? all.en[key] ?? String(key);
}

// Key-first style used by shell/home (preferred for chrome nav)
export function tKey(key: string, locale: Locale = "en"): string {
  // Try new style first, then fall back to legacy key map if present
  if (key in (all[locale] || {})) return (all[locale])[key] ?? (all.en)[key] ?? key;
  // Fallback to previous flat map (if we still have STRINGS)
  const flat = (globalThis as any).__TSG_FLAT_STRINGS;
  if (flat && flat[key]) return flat[key][locale] ?? flat[key].en ?? key;
  return String(key);
}

export const getLocaleFromRail = getLocale;

/** Resolve UI locale: explicit arg → dataset.uiLang → data-rail. */
export function resolveUiLocale(explicit?: Locale): Locale {
  if (explicit) return explicit;
  const root = document.documentElement;
  if (root?.dataset?.uiLang === "vi" || root?.dataset?.uiLang === "en") {
    return root.dataset.uiLang;
  }
  return root?.dataset?.rail === "vi" ? "vi" : "en";
}

/**
 * Set UI language on <html> and re-apply all data-i18n chrome.
 * Profile uiLang changes in Account should call this (optional integration).
 */
export function setUiLang(lang: Locale): void {
  document.documentElement.dataset.uiLang = lang;
  applyI18n(document, lang);
}

// Apply data-i18n and data-i18n-title using resolved UI locale
export function applyI18n(root: HTMLElement | Document = document, locale?: Locale): void {
  const loc = resolveUiLocale(locale);
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n!;
    el.textContent = tKey(k, loc);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const k = el.dataset.i18nTitle!;
    el.title = tKey(k, loc);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-placeholder]").forEach((el) => {
    const k = el.dataset.i18nPlaceholder!;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.placeholder = tKey(k, loc);
    }
  });
}

/** Current UI locale for programmatic strings (uiLang → rail). */
export function getCurrentLocale(): Locale {
  try {
    return resolveUiLocale();
  } catch {
    return "vi";
  }
}

/** Replace `{name}` tokens in a translated string. */
export function tFormat(key: string, locale: Locale, vars: Record<string, string | number>): string {
  let out = tKey(key, locale);
  for (const [name, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${name}}`, String(value));
  }
  return out;
}

// Legacy flat map support (populated for nav/home if needed)
export const STRINGS: Record<string, { en: string; vi: string }> = {
  "nav.home": { en: "Home", vi: "Trang chủ" },
  "nav.library": { en: "Library", vi: "Thư viện" },
  "nav.grammar": { en: "Grammar", vi: "Ngữ pháp" },
  "nav.flashcards": { en: "Review", vi: "Ôn tập" },
  "nav.account": { en: "Account", vi: "Tài khoản" },
  "nav.login": { en: "Log in", vi: "Đăng nhập" },
  "brand.name": { en: "Tsumugu", vi: "Tsumugu" },
  "brand.tag": { en: "Beta", vi: "Beta" },
  "rail.label": { en: "Rail", vi: "Rail" },
  "rail.en": { en: "EN", vi: "EN" },
  "rail.vi": { en: "VI", vi: "VI" },
  "action.start": { en: "Start reading", vi: "Bắt đầu đọc" },
  "action.browse": { en: "Browse library", vi: "Duyệt thư viện" },
};

(globalThis as any).__TSG_FLAT_STRINGS = STRINGS;

export function tLegacy(key: string, locale: Locale = "en"): string {
  const entry = STRINGS[key];
  if (entry) return entry[locale] ?? entry.en ?? key;
  return tKey(key, locale);
}
