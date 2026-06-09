/**
 * Path helpers for translating ExpressoTS / Express route paths into the
 * OpenAPI path-templating syntax and matching concrete request paths back
 * to their route template.
 */

/**
 * Convert an Express-style path to an OpenAPI-style path and report the
 * path parameter names.
 *
 *   `/users/:id`          -> `{ openApiPath: '/users/{id}', params: ['id'] }`
 *   `/users/:id(\\d+)`    -> `{ openApiPath: '/users/{id}', params: ['id'] }`
 *   `/users/:a/posts/:b`  -> two params
 *
 * Inline regex constraints (`:id(\\d+)`) are stripped — OpenAPI carries
 * those as a `schema.pattern`, which we don't attempt to reconstruct.
 */
export function toOpenApiPath(path: string): {
  openApiPath: string;
  params: string[];
} {
  const params: string[] = [];
  const openApiPath = path.replace(
    /:([A-Za-z_$][\w$]*)(\([^)]*\))?/g,
    (_match, name: string) => {
      params.push(name);
      return `{${name}}`;
    },
  );
  return { openApiPath, params };
}

/**
 * Build a matcher that tests whether a concrete request path (e.g.
 * `/users/42`) belongs to a route template (e.g. `/users/:id`).
 *
 * Templates are anchored and dynamic segments become `[^/]+`. A trailing
 * slash on either side is tolerated.
 */
export function makePathMatcher(template: string): (concrete: string) => boolean {
  const normalized = stripTrailingSlash(template);
  const pattern = normalized
    // Escape regex-significant characters in the literal portions.
    .replace(/[.*+?^${}()|[\]\\]/g, (ch) => {
      // Keep `:` colons (handled below) and `/` intact.
      return `\\${ch}`;
    })
    // Re-collapse the escaping we just applied to the param markers so we
    // can swap them for a wildcard. `:name` became `:name` (colon isn't
    // escaped). Replace each `:name` segment with a non-greedy wildcard.
    .replace(/:[A-Za-z_$][\w$]*/g, '[^/]+');

  const re = new RegExp(`^${pattern}/?$`);
  return (concrete: string) => re.test(stripTrailingSlash(concrete));
}

function stripTrailingSlash(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

/**
 * Detect the leading API version segment of a path, if any.
 *
 *   `/v2/users` -> `2`     `/V1/x` -> `1`     `/users` -> undefined
 */
export function detectVersionSegment(path: string): string | undefined {
  const m = path.match(/^\/v(\w+)(?:\/|$)/i);
  return m ? m[1] : undefined;
}

/**
 * Normalise a global route prefix the same way the live agent does:
 * an empty value or `"/"` means "no prefix", and a trailing slash is
 * stripped (`"/api/"` -> `"/api"`).
 */
export function normaliseGlobalPrefix(value: string | undefined): string {
  if (!value || typeof value !== 'string') return '';
  if (value === '/' || value === '') return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Splice a normalised prefix onto a controller-relative path without
 * doubling separators: `/api` + `/` -> `/api/`, `/api` + `users` ->
 * `/api/users`, `/api` + `/users` -> `/api/users`.
 */
export function joinPrefixWithRoute(prefix: string, path: string): string {
  if (!path || path === '/') return `${prefix}/`;
  return prefix + (path.startsWith('/') ? path : `/${path}`);
}

/**
 * Return a copy of `routes` with `prefix` applied to every path. Mirrors
 * the agent's runtime prefixing so a headless CLI scan produces the same
 * paths Studio shows (and a committed spec can be diffed against).
 *
 * A falsy / `"/"` prefix returns the routes unchanged.
 */
export function applyGlobalPrefix<T extends { path: string }>(
  routes: ReadonlyArray<T>,
  prefix: string | undefined,
): T[] {
  const normalized = normaliseGlobalPrefix(prefix);
  if (!normalized) return [...routes];
  return routes.map((r) => ({
    ...r,
    path: joinPrefixWithRoute(normalized, r.path),
  }));
}
