/**
 * Minimal transient toast + a one-time "first grade" trigger.
 *
 * The first time a learner grades a word in a session, Tsumugu tells them their
 * progress is saved locally and portable. Lane C owns the WordStore; this reads
 * a boolean "has any tracked word" signal it emits and fires the toast once.
 */

export function showToast(message: string, host: HTMLElement = document.body): HTMLElement {
  const node = document.createElement("div");
  node.className = "tsg-toast";
  node.setAttribute("role", "status");
  node.textContent = message;
  host.append(node);
  setTimeout(() => node.remove(), 4200);
  return node;
}

/**
 * Returns a function that fires `show(message)` exactly once, on the first call
 * where `hasGraded` is true. Pass `alreadyFired` true to suppress it for
 * returning visitors who already had progress at boot.
 */
export function createFirstGradeToast(opts: {
  message: string;
  show?: (message: string) => void;
  alreadyFired?: boolean;
}): (hasGraded: boolean) => void {
  let fired = opts.alreadyFired === true;
  const show = opts.show ?? ((m: string) => { showToast(m); });
  return (hasGraded: boolean) => {
    if (fired || !hasGraded) return;
    fired = true;
    show(opts.message);
  };
}
