/**
 * Resource-tag derivation shared by the OpenAPI spec builder and the Studio
 * API Client sidebar so both group routes the same way.
 *
 * A "resource tag" is a stable, human-meaningful group label derived from a
 * route's path (e.g. `/v1/users/:id` -> `users`,
 * `/v1/organizations/:orgId/integrations/azure-devops/repositories` ->
 * `azure-devops`). Routes are clustered by their deepest shared static path
 * segment so siblings collapse into one group.
 *
 * KEEP IN SYNC with the agent source of truth at
 * `packages/studio-agent/src/openapi/resource-tags.ts`. This is a pure,
 * dependency-free module intentionally duplicated across the agent/UI boundary
 * (the same convention used for the `RouteInfo` type), because the
 * Vite-bundled UI does not import the agent package.
 */

export interface RouteLike {
  path: string;
  method: string;
  controller?: string;
}

export interface ResourceGroup<T extends RouteLike> {
  /** Resource label, e.g. `users`, `azure-devops`, or `root`. */
  tag: string;
  routes: T[];
}

export interface DeriveResourceOptions {
  /** Global route prefix to strip before deriving (e.g. `/api`). */
  globalPrefix?: string;
}

/** Stable identity for a route across renders / persistence. */
export function routeKey(route: RouteLike): string {
  return `${route.method.toUpperCase()} ${route.path}`;
}

function normalizePrefix(value: string | undefined): string {
  if (!value || value === '/') return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function isParamSegment(seg: string): boolean {
  return seg.startsWith(':') || (seg.startsWith('{') && seg.endsWith('}'));
}

/** Static (non-parametric) path segments after stripping prefix + version. */
function staticSegments(path: string, prefix: string): string[] {
  let p = path;
  if (prefix && p.startsWith(prefix)) p = p.slice(prefix.length);
  // Strip a leading version segment: `/v1`, `/v2`, `/vbeta`, ...
  p = p.replace(/^\/v\w+(?=\/|$)/i, '');
  return p
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isParamSegment(s));
}

/** Fallback label for routes with no usable static segment (e.g. `/`). */
function controllerToTag(controller?: string): string {
  if (!controller || controller === 'Unknown') return 'root';
  const base = controller.replace(/Controller$/, '');
  if (!base) return 'root';
  const kebab = base
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
  return kebab || 'root';
}

interface TrieNode {
  count: number;
  children: Map<string, TrieNode>;
}

/**
 * Group routes by derived resource tag. Each route's tag is the deepest
 * static path segment whose subtree contains more than one route, so sibling
 * routes (e.g. `GET /users` + `GET /users/:id`) collapse under one resource.
 * Routes with no static segment fall back to a controller-derived label, then
 * `root`. Groups are returned alpha-sorted with `root` last.
 */
export function deriveResourceGroups<T extends RouteLike>(
  routes: ReadonlyArray<T>,
  opts: DeriveResourceOptions = {},
): ResourceGroup<T>[] {
  const prefix = normalizePrefix(opts.globalPrefix);
  const segsByIndex = routes.map((r) => staticSegments(r.path, prefix));

  // Build a trie counting how many routes pass through each segment node.
  const root: TrieNode = { count: 0, children: new Map() };
  for (const segs of segsByIndex) {
    let node = root;
    for (const seg of segs) {
      let child = node.children.get(seg);
      if (!child) {
        child = { count: 0, children: new Map() };
        node.children.set(seg, child);
      }
      child.count += 1;
      node = child;
    }
  }

  const tagFor = (segs: string[], controller?: string): string => {
    if (segs.length === 0) return controllerToTag(controller);
    let node = root;
    let deepestShared: string | undefined;
    for (const seg of segs) {
      const child = node.children.get(seg);
      if (!child) break;
      if (child.count > 1) deepestShared = seg;
      node = child;
    }
    return deepestShared ?? segs[0];
  };

  const byTag = new Map<string, T[]>();
  routes.forEach((r, i) => {
    const tag = tagFor(segsByIndex[i], r.controller);
    const list = byTag.get(tag) ?? [];
    list.push(r);
    byTag.set(tag, list);
  });

  const groups: ResourceGroup<T>[] = [];
  for (const [tag, list] of byTag) {
    list.sort((a, b) =>
      a.path === b.path
        ? a.method.localeCompare(b.method)
        : a.path.localeCompare(b.path),
    );
    groups.push({ tag, routes: list });
  }
  groups.sort((a, b) => {
    if (a.tag === 'root' && b.tag !== 'root') return 1;
    if (b.tag === 'root' && a.tag !== 'root') return -1;
    return a.tag.localeCompare(b.tag);
  });
  return groups;
}

/** Convenience map of `routeKey` -> resource tag (used by the OpenAPI builder). */
export function deriveResourceTagMap(
  routes: ReadonlyArray<RouteLike>,
  opts: DeriveResourceOptions = {},
): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of deriveResourceGroups(routes, opts)) {
    for (const r of group.routes) map.set(routeKey(r), group.tag);
  }
  return map;
}
