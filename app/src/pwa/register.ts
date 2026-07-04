/** Register the service worker in production; no-op in dev. */
export function registerSW(): void {
  if (import.meta.env.DEV) return;
  if (!("serviceWorker" in navigator)) return;

  const showUpdate = (): void => {
    const el = document.getElementById("sw-update");
    if (el) {
      el.hidden = false;
      return;
    }
    const banner = document.createElement("div");
    banner.id = "sw-update";
    banner.setAttribute("role", "status");
    banner.style.cssText =
      "position:fixed;bottom:1rem;right:1rem;z-index:9999;padding:.6rem 1rem;" +
      "background:var(--raw-card,#fff);border:1px solid var(--raw-rule,#e7e3da);" +
      "border-radius:.5rem;box-shadow:var(--shadow-sm,0 1px 3px rgba(0,0,0,.1));" +
      "font:500 .875rem/1.4 Inter,system-ui,sans-serif;color:var(--raw-ink,#222);";
    const vi = document.documentElement.dataset.rail === "vi";
    banner.textContent = vi ? "Có phiên bản mới · " : "New version available · ";
    const reload = document.createElement("button");
    reload.type = "button";
    reload.textContent = vi ? "tải lại" : "reload";
    reload.style.cssText =
      "margin-left:.25rem;background:none;border:none;padding:0;" +
      "color:var(--raw-violet,#6b4bd6);cursor:pointer;font:inherit;text-decoration:underline;";
    reload.addEventListener("click", () => location.reload());
    banner.append(reload);
    document.body.append(banner);
  };

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    showUpdate();
  });

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              showUpdate();
            }
          });
        });
      })
      .catch(() => {
        /* SW registration is best-effort */
      });
  });
}