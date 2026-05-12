/**
 * Tiny recursive JSON diff used by the Replay view.
 *
 * Produces a list of `Change` records that downstream renderers can lay
 * out as added / removed / modified rows. The design goal is "good enough
 * to debug a 4xx that used to be a 2xx" — not a fully RFC-6902 patch.
 */

export type ChangeKind = 'added' | 'removed' | 'changed' | 'equal';

export interface Change {
  /** Dot/bracket path into the document, e.g. "user.address[2].city". */
  path: string;
  kind: ChangeKind;
  /** Value as it appears in the "before" document (undefined for added). */
  before?: unknown;
  /** Value as it appears in the "after" document (undefined for removed). */
  after?: unknown;
}

export interface DiffSummary {
  changes: Change[];
  added: number;
  removed: number;
  changed: number;
  /** True when both documents are deeply equal. */
  identical: boolean;
}

const MAX_DEPTH = 8;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function appendPath(base: string, key: string | number): string {
  if (typeof key === 'number') return `${base}[${key}]`;
  if (!base) return key;
  // Bracket-quote keys that contain non-identifier chars so paths roundtrip.
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return `${base}.${key}`;
  return `${base}[${JSON.stringify(key)}]`;
}

/**
 * Compare two JSON-shaped values. Strings, numbers, booleans, null, arrays,
 * and plain objects are supported. Unknown types compare by reference.
 */
export function diffJson(before: unknown, after: unknown): DiffSummary {
  const changes: Change[] = [];
  walk(before, after, '', 0, changes);

  const added = changes.filter((c) => c.kind === 'added').length;
  const removed = changes.filter((c) => c.kind === 'removed').length;
  const changed = changes.filter((c) => c.kind === 'changed').length;
  return {
    changes,
    added,
    removed,
    changed,
    identical: added + removed + changed === 0,
  };
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  depth: number,
  out: Change[],
): void {
  if (Object.is(before, after)) return; // identical primitives or same reference

  if (depth > MAX_DEPTH) {
    // Bail out — record as a leaf change to avoid runaway recursion.
    out.push({ path, kind: 'changed', before, after });
    return;
  }

  // Different shape categories → record as a single leaf change.
  const beforeIsArr = Array.isArray(before);
  const afterIsArr = Array.isArray(after);
  const beforeIsObj = isObject(before);
  const afterIsObj = isObject(after);

  if (beforeIsArr && afterIsArr) {
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i++) {
      const hasB = i < before.length;
      const hasA = i < after.length;
      const childPath = appendPath(path, i);
      if (!hasB) {
        out.push({ path: childPath, kind: 'added', after: after[i] });
      } else if (!hasA) {
        out.push({ path: childPath, kind: 'removed', before: before[i] });
      } else {
        walk(before[i], after[i], childPath, depth + 1, out);
      }
    }
    return;
  }

  if (beforeIsObj && afterIsObj) {
    const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const hasB = key in before;
      const hasA = key in after;
      const childPath = appendPath(path, key);
      if (!hasB) {
        out.push({ path: childPath, kind: 'added', after: after[key] });
      } else if (!hasA) {
        out.push({ path: childPath, kind: 'removed', before: before[key] });
      } else {
        walk(before[key], after[key], childPath, depth + 1, out);
      }
    }
    return;
  }

  // Primitive or type-mismatch leaf.
  if (before === undefined) {
    out.push({ path, kind: 'added', after });
  } else if (after === undefined) {
    out.push({ path, kind: 'removed', before });
  } else if (!shallowEqual(before, after)) {
    out.push({ path, kind: 'changed', before, after });
  }
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  // Strings, numbers, booleans, null, undefined are handled by Object.is.
  // For Dates / regex / other built-ins, compare by string representation.
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────
// Headers diff (case-insensitive keys, single string value per header)
// ────────────────────────────────────────────────────────────────────────

export interface HeaderChange {
  name: string;
  before?: string;
  after?: string;
  kind: 'added' | 'removed' | 'changed';
}

const IGNORED_HEADERS = new Set([
  'date',
  'content-length',
  'etag',
  'last-modified',
  'x-request-id',
  'x-trace-id',
  'x-response-time',
]);

export function diffHeaders(
  before: Record<string, string> = {},
  after: Record<string, string> = {},
): HeaderChange[] {
  const result: HeaderChange[] = [];
  const norm = (h: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(h)) {
      const lc = k.toLowerCase();
      if (IGNORED_HEADERS.has(lc)) continue;
      out[lc] = String(v);
    }
    return out;
  };
  const b = norm(before);
  const a = norm(after);
  const keys = new Set<string>([...Object.keys(b), ...Object.keys(a)]);
  for (const k of keys) {
    if (!(k in b)) result.push({ name: k, after: a[k], kind: 'added' });
    else if (!(k in a)) result.push({ name: k, before: b[k], kind: 'removed' });
    else if (b[k] !== a[k]) result.push({ name: k, before: b[k], after: a[k], kind: 'changed' });
  }
  return result.sort((x, y) => x.name.localeCompare(y.name));
}
