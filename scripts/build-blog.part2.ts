export const CHROME_CSS = `
:root{
  color-scheme:light;
  --f-read:"LXGW WenKai TC","Kaiti TC","Songti TC","Noto Serif TC",serif;
  --f-disp:"Noto Serif TC","Songti TC","Kaiti TC",serif;
  --f-ui:"Inter","Be Vietnam Pro",-apple-system,"Segoe UI","PingFang TC","Microsoft JhengHei",sans-serif;
  --bg:#FBFBF9; --surface:#FFFFFF; --ink:#1D1B17; --muted:#6A655A; --faint:#757060;
  --border:#ECEAE4; --line:#F0EEE9;
  --kraft:#CDC9BF;
  --obi-bg:#F5F4F0; --obi-ink:#6A655A;
  --g:#3B8577; --g-text:#38806F; --on-g:#F2FBF9; --g-wash:rgba(59,133,119,.07); --halo:rgba(59,133,119,.11);
  --new:#B26179; --learn:#B08942;
  --shadow:0 1px 2px rgba(29,27,23,.05), 0 8px 26px rgba(29,27,23,.05);
  /* inert — Seal-red predecessor kept for reference, not used:
     --g:#9E3A34; --g-text:#9E3A34; --on-g:#FBF3F1; */
}
[data-theme="dark"]{
  color-scheme:dark;
  --bg:#141613; --surface:#1B1E19; --ink:#E9E7DF; --muted:#A8A294; --faint:#857F6E;
  --border:#2A2D26; --line:#23261F;
  --kraft:#57544B;
  --obi-bg:#20231E; --obi-ink:#A8A294;
  --g:#77C6B3; --g-text:#77C6B3; --on-g:#0B1713; --g-wash:rgba(119,198,179,.10); --halo:rgba(119,198,179,.17);
  --new:#C98BA0; --learn:#C9A25E;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 28px rgba(0,0,0,.35);
}

*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--f-ui);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
:focus-visible{outline:2px solid var(--g);outline-offset:2px;border-radius:4px}
button{font:inherit;color:inherit;background:none;border:none;padding:0;cursor:pointer}
a{color:inherit;text-decoration:none}

/* shared header */
.top{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
.top .in{max-width:1240px;margin:0 auto;padding:10px 24px;display:flex;align-items:center;gap:18px}
.brand{display:flex;align-items:center;gap:10px}
.brand .seal{width:28px;height:28px;border-radius:8px;background:var(--g);color:var(--on-g);font-family:var(--f-read);font-weight:700;font-size:17px;display:grid;place-items:center;box-shadow:0 0 10px var(--halo)}
.brand .word{font-family:var(--f-disp);font-weight:700;font-size:17px;letter-spacing:.01em}
.brand .beta{font-family:var(--f-ui);font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--g-text);background:var(--g-wash);border:1px solid color-mix(in srgb,var(--g) 30%,transparent);border-radius:999px;padding:2px 8px;line-height:1}
.nav{display:flex;gap:2px;margin-left:6px}
.nav a{padding:6px 13px;border-radius:8px;font-size:13.5px;font-weight:500;color:var(--muted);display:flex;align-items:baseline;gap:5px}
.nav a .en{font-size:12px;color:var(--faint)}
.nav a:hover{color:var(--ink);background:var(--line)}
.nav a[aria-current="page"]{color:var(--g-text);background:var(--g-wash)}
.nav a[aria-current="page"] .en{color:var(--g-text)}
.top .grow{flex:1}
.theme{width:32px;height:32px;border:1px solid var(--border);border-radius:8px;font-size:14px;color:var(--muted);display:grid;place-items:center}
.theme:hover{color:var(--ink);border-color:var(--kraft)}

main{max-width:1240px;margin:0 auto;padding:26px 24px 72px}

/* obi band (signature) — reused as the post meta line */
.obi{font-family:var(--f-disp);font-size:12.5px;color:var(--obi-ink);background:var(--obi-bg);border:1px solid var(--border);border-radius:8px;padding:8px 15px;letter-spacing:.01em;display:inline-block}
.obi b{font-weight:600}

/* section head */
.sec-head{display:flex;align-items:baseline;gap:12px;margin:0 0 6px}
.sec-head h1{font-family:var(--f-disp);font-weight:700;font-size:26px;margin:0}
.sec-en{font-size:13px;color:var(--faint)}
.sec-cnt{margin-left:auto;font-size:12.5px;color:var(--muted)}
.lede{margin:0 0 26px;font-size:14px;color:var(--muted);max-width:640px}

/* index: quiet cards */
.postlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px;max-width:760px}
.postlist li{margin:0}
.pcard{display:block;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px;transition:border-color .15s ease}
.pcard:hover{border-color:var(--kraft)}
.pcard .pt{font-family:var(--f-disp);font-weight:700;font-size:19px;line-height:1.3;color:var(--ink);margin:0 0 6px}
.pcard:hover .pt{color:var(--g-text)}
.pcard .pmeta{font-size:12px;color:var(--faint);font-variant-numeric:tabular-nums;margin:0 0 8px}
.pcard .pdesc{font-size:14px;color:var(--muted);line-height:1.55;margin:0}

/* post */
.post{max-width:680px;margin:0 auto}
.post .backlink{display:inline-block;font-size:13px;color:var(--muted);margin:0 0 20px}
.post .backlink:hover{color:var(--g-text)}
.post h1.ptitle{font-family:var(--f-disp);font-weight:700;font-size:clamp(28px,4.5vw,40px);line-height:1.18;letter-spacing:.005em;margin:0 0 14px}
.post .pmeta{margin:0 0 30px}
.prose{font-family:var(--f-read);font-size:18.5px;line-height:1.85;color:var(--ink)}
.prose p{margin:0 0 1.25em}
.prose h2{font-family:var(--f-disp);font-weight:700;font-size:22px;line-height:1.3;margin:1.8em 0 .6em}
.prose h3{font-family:var(--f-disp);font-weight:600;font-size:18px;margin:1.6em 0 .5em}
.prose ul{margin:0 0 1.25em;padding-left:1.3em}
.prose li{margin:0 0 .4em}
.prose a{color:var(--g-text);text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--g) 40%,transparent);text-underline-offset:2px}
.prose a:hover{text-decoration-color:var(--g)}
.prose strong{font-weight:700;color:var(--ink)}
.prose code{font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;font-size:.86em;background:var(--obi-bg);border:1px solid var(--border);border-radius:5px;padding:.05em .35em}
.prose pre{font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;font-size:13px;line-height:1.6;background:var(--obi-bg);border:1px solid var(--border);border-radius:10px;padding:16px 18px;overflow-x:auto;margin:0 0 1.5em}
.prose pre code{background:none;border:none;padding:0;font-size:inherit}
.prose table{width:100%;border-collapse:collapse;font-size:14.5px;line-height:1.55;margin:0 0 1.5em;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.prose th{font-family:var(--f-ui);font-weight:600;font-size:12.5px;letter-spacing:.02em;text-align:left;color:var(--muted);background:var(--obi-bg);border-bottom:1px solid var(--border);padding:9px 13px}
.prose td{border-bottom:1px solid var(--line);padding:9px 13px;vertical-align:top}
.prose tr:last-child td{border-bottom:none}

/* footer */
footer{border-top:1px solid var(--border)}
.ft{max-width:1240px;margin:0 auto;padding:18px 24px 30px;font-family:var(--f-ui);font-size:12px;color:var(--faint);display:flex;gap:6px 18px;flex-wrap:wrap}
.ft .fbrand{color:var(--muted)}

@media (max-width:640px){
  .top .in{padding:8px 14px;gap:10px}
  main{padding:20px 14px 56px}
  .nav a .en{display:none}
  .prose{font-size:17.5px}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important}html{scroll-behavior:auto}}
`.trim();
