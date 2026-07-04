/**
 * Shared site footer (rendered into #app-footer on every surface).
 *
 * One quiet band: brand (紡 seal + Tsumugu + Beta pill) + a compact link row so
 * the secondary pages (Blog, Privacy, Feedback…) never dead-end. Nothing else —
 * the footer doesn't narrate the product (DESIGN-PRINCIPLES §11); taglines,
 * corpus notes, and type credits belong to the About/colophon page if anywhere.
 * Bilingual via the established `.en-only`/`.vi-only` spans (toggled by
 * `:root[data-rail]` in reader.css); no new i18n keys.
 *
 * The static footer baked into index.html is the no-JS fallback; this replaces it
 * once the shell boots so the footer content lives in one owned place.
 */

import { blogHref } from "../app/router.js";

function footerHTML(): string {
  const blog = blogHref();
  return `
    <div class="ft-min">
      <span class="ft-brand"><span class="knot">紡</span><span class="word">Tsumugu</span><span class="beta-pill">Beta</span></span>
      <nav class="ft-links" aria-label="Site">
        <a href="#home"><span class="en-only">Home</span><span class="vi-only">Trang chủ</span></a>
        <a href="#library"><span class="en-only">Library</span><span class="vi-only">Thư viện</span></a>
        <a href="#read"><span class="en-only">Reader</span><span class="vi-only">Đọc</span></a>
        <a href="${blog}">誌 <span class="en-only">Blog</span><span class="vi-only">Blog</span></a>
        <a href="#about"><span class="en-only">About</span><span class="vi-only">Giới thiệu</span></a>
        <a href="#privacy"><span class="en-only">Privacy</span><span class="vi-only">Riêng tư</span></a>
        <a href="#terms"><span class="en-only">Terms</span><span class="vi-only">Điều khoản</span></a>
        <a href="#feedback"><span class="en-only">Feedback</span><span class="vi-only">Phản hồi</span></a>
      </nav>
    </div>`;
}

/**
 * Render (or re-render) the shared footer into #app-footer. Idempotent: safe to
 * call on every boot. No-ops when the footer host is absent (e.g. unit tests).
 */
export function renderAppFooter(): void {
  const footer = document.getElementById("app-footer");
  if (!footer) return;
  footer.innerHTML = footerHTML();
}
