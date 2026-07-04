/**
 * Import-panel copy, EN + VI (WO-UNIFY-B B10 sweep: every user string ships
 * both rails; no em dashes). Locale is the current rail at render time.
 */

export const IMPORT_PRIVACY_NOTICE_EN =
  "Your text is processed entirely in your browser. We never send it to a server, store it, or add it to any shared library.";

export const IMPORT_PRIVACY_NOTICE_VI =
  "Văn bản của bạn được xử lý hoàn toàn trong trình duyệt. Chúng tôi không bao giờ gửi lên máy chủ, lưu trữ, hay thêm vào thư viện chung nào.";

export const IMPORT_CAPTION_EN =
  "Paste or drag a .txt/.md file (client-side only; no upload, no shared library). EPUB opens locally.";

export const IMPORT_CAPTION_VI =
  "Dán hoặc kéo tệp .txt/.md (chỉ xử lý phía trình duyệt; không tải lên, không thư viện chung). EPUB mở cục bộ.";

function isViRail(): boolean {
  try {
    return document.documentElement.dataset.rail === "vi";
  } catch {
    return false;
  }
}

export function importPrivacyNotice(vi: boolean = isViRail()): string {
  return vi ? IMPORT_PRIVACY_NOTICE_VI : IMPORT_PRIVACY_NOTICE_EN;
}

export function importCaption(vi: boolean = isViRail()): string {
  return vi ? IMPORT_CAPTION_VI : IMPORT_CAPTION_EN;
}

/** @deprecated EN-only aliases kept for existing imports; prefer the functions. */
export const IMPORT_PRIVACY_NOTICE = IMPORT_PRIVACY_NOTICE_EN;
export const IMPORT_CAPTION = IMPORT_CAPTION_EN;
