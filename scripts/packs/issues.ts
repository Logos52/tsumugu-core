export interface PackIssue {
  pack: string;
  path: string;
  message: string;
}

export interface AllowlistEntry {
  pack: string;
  path: string;
  message: string;
}

export function issue(pack: string, path: string, message: string): PackIssue {
  return { pack, path, message };
}

export function formatIssue(item: PackIssue): string {
  return `${item.pack} ${item.path}: ${item.message}`;
}

export function applyAllowlist(issues: PackIssue[], allow: AllowlistEntry[]): PackIssue[] {
  const used = new Set<number>();
  const remaining: PackIssue[] = [];
  for (const item of issues) {
    const match = allow.findIndex(
      (entry, index) =>
        !used.has(index) &&
        entry.pack === item.pack &&
        entry.path === item.path &&
        entry.message === item.message,
    );
    if (match === -1) remaining.push(item);
    else used.add(match);
  }
  for (let index = 0; index < allow.length; index += 1) {
    if (used.has(index)) continue;
    const entry = allow[index];
    if (!entry) continue;
    remaining.push(
      issue("allowlist", `${entry.pack} ${entry.path}`, `stale allowlist entry: ${entry.message}`),
    );
  }
  return remaining;
}
