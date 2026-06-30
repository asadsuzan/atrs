/**
 * Dot-path edits for JSON files (e.g. removing pro defaults from block.json,
 * which can't carry comment markers).
 *
 * Path segments are split on ".". Numeric segments index into arrays. There is
 * no support for keys that themselves contain dots — none of the WordPress
 * block.json attribute names do.
 */

function isIndex(seg: string): boolean {
  return /^\d+$/.test(seg);
}

/** Deletes the value at `dotPath`. Returns true if something was removed. */
export function deletePath(obj: unknown, dotPath: string): boolean {
  const parts = dotPath.split('.');
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== 'object') return false;
    cur = cur[parts[i]];
  }
  if (cur == null || typeof cur !== 'object') return false;
  const last = parts[parts.length - 1];
  if (Array.isArray(cur) && isIndex(last)) {
    const idx = Number(last);
    if (idx < 0 || idx >= cur.length) return false;
    cur.splice(idx, 1);
    return true;
  }
  if (Object.prototype.hasOwnProperty.call(cur, last)) {
    delete cur[last];
    return true;
  }
  return false;
}

/** Sets the value at `dotPath`, creating intermediate objects as needed. */
export function setPath(obj: unknown, dotPath: string, value: unknown): void {
  const parts = dotPath.split('.');
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

export interface JsonPatchOps {
  remove?: string[];
  set?: Record<string, unknown>;
}

/** Applies remove/set ops to a parsed JSON object in place. Returns ops applied. */
export function applyJsonPatch(json: unknown, ops: JsonPatchOps): { removed: string[]; set: string[] } {
  const removed: string[] = [];
  for (const p of ops.remove ?? []) {
    if (deletePath(json, p)) removed.push(p);
  }
  const set: string[] = [];
  for (const [p, value] of Object.entries(ops.set ?? {})) {
    setPath(json, p, value);
    set.push(p);
  }
  return { removed, set };
}
