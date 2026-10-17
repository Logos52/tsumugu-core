

function showToast(message: string, host: HTMLElement = document.body): HTMLElement {
  const node = document.createElement("div");
  node.className = "tsg-toast";
  node.setAttribute("role", "status");
  node.textContent = message;
  host.append(node);
  setTimeout(() => node.remove(), 4200);
  return node;
}

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
