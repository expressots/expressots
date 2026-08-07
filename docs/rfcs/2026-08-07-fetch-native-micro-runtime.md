# RFC: Fetch-native micro runtime

- **Status:** Proposed — decision requested
- **Date:** 2026-08-07
- **Issue:** #947 (task 4 of #945)
- **Supersedes framing of:** #948, #949, #950, #951 (all now closed)

## Summary

`micro()` is an Express application. Every serverless adapter reaches it by hand-building an
object shaped like `http.IncomingMessage` / `http.ServerResponse` and handing it to
`expressApp(req, res, next)`. That mock is the shared root cause of four already-closed
defects and of the compensation layers now living in `micro.ts`.

This RFC proposes inverting the arrangement: a runtime-neutral router whose handler contract is
`(Request, ctx) => Response`, with Node becoming one adapter among several rather than the
substrate everything else imitates.

The proposal is backed by a measured prototype rather than estimates. **Read
[Measured evidence](#measured-evidence) before the design** — it is what the decision should
rest on.

## Re-baselining #947

Two premises in the issue no longer hold. They are corrected here because the case for this work
is weaker than #947 states, and the decision should be made against what is true today.

**The bugs are fixed.** #948, #949, #950 and #951 are all closed, patched by #957 and #958.
The symptom table in #947 describes history, not live pain. Nothing in this RFC is urgent
bug-fixing.

**The bundle figure is stale.** #947 cites 2.4 MB raw / 536 KB gzip. That predates #961, which
cut the Worker bundle by 62%. The current measured baseline is **202.08 KiB gzip**. So the
headline is not "tens of KB versus 536 KB" — it is "single-digit KB versus 202 KiB". Still
decisive, but a smaller claim than the issue makes.

What survives is the part patching cannot reach:

- streaming responses are impossible today, because `end()` resolves one buffered `Response`;
- `nodejs_compat` is mandatory;
- each new divergence between runtimes costs another compensation layer;
- there are N runtime behaviours to test rather than one.

## Measured evidence

A throwaway prototype was built to test the claims rather than assert them: a fetch-native
router with the feature surface `micro()` exposes — routing with path params, a global prefix,
middleware, auto-sent return values, a settable error handler, and the RFC-7807 404 including
route suggestions. It was bundled with Wrangler 4.118 and executed on workerd.

|                            | `micro()` today    | Prototype      |
| -------------------------- | ------------------ | -------------- |
| Bundle, gzip               | **202.08 KiB**     | **2.33 KiB**   |
| Bundle, raw                | not measured here  | **6.40 KiB**   |
| `nodejs_compat`            | **required**       | **not needed** |
| `node:` builtins pulled in | **21**             | **0**          |
| Additional shims           | `iconv-lite` alias | none           |
| Streaming                  | impossible         | works          |

The 202.08 KiB baseline is the `base` scenario of the bundle gate added in #962, measured in CI
on the Node 22 leg. The prototype figure is `wrangler deploy --dry-run` on a config with **no**
`compatibility_flags`.

### The `nodejs_compat` requirement is broader than #947 states

Building today's `micro()` Worker with the flag removed reports 21 distinct Node builtins that
workerd does not provide:

```
node:async_hooks  node:buffer     node:child_process  node:crypto    node:events
node:fs           node:fs/promises node:http          node:https     node:module
node:net          node:path       node:perf_hooks     node:process   node:querystring
node:stream       node:stream/web  node:string_decoder node:url      node:util
node:zlib
```

Each carries "Your Worker may throw errors at runtime unless you enable the `nodejs_compat`
compatibility flag." Among them are `node:child_process`, `node:fs` and `node:net` — process
spawning, filesystem and raw sockets, in a runtime that offers none of the three. That is the
impedance mismatch stated precisely.

### Behavioural verification

Eight tests run against the prototype on workerd with the flag off. Four assert exactly what
needed adapter patches:

| Assertion                             | Previously                                                |
| ------------------------------------- | --------------------------------------------------------- |
| Multiple `Set-Cookie` survive         | #948 — collapsed by a `Record<string, string>` header map |
| Binary body round-trips byte-for-byte | #949 — corrupted by `await request.text()`                |
| Duplicate query keys preserved        | #949 — dropped by hand-rolled parsing                     |
| `setErrorHandler` fires               | #950 — dead outside `listen()`                            |

Plus the RFC-7807 404 with suggestions, and a chunked `ReadableStream` response — the last being
the capability the current architecture cannot provide at any level of patching.

### What the prototype does not prove

It is roughly 200 lines and is **not** feature-equivalent. It omits Studio agent integration, the
Express-middleware compatibility path, core's full suggestion engine, and `qs` bracket parsing.
**2.33 KiB is a floor, not a shipping number.** The honest claim is narrower: the missing pieces
are bounded and none of them require `node:http`, and the margin to the 100 KB acceptance
criterion is roughly 40×, so the conclusion survives a large miss.

## Goals

- One request/response semantic across Node, Workers, Vercel Edge, Deno and Bun.
- `nodejs_compat` optional rather than mandatory.
- Streaming responses on edge targets.
- Under 100 KB gzip for the default scaffold (acceptance criterion of #947).
- The `micro()` public surface — `app.get`, `app.use`, `setErrorHandler`, `listen` — preserved.

## Non-goals

- Changing the `application` template or the DI bootstrap path. That stays on Express.
- A v4 breaking change to `micro()`'s documented surface.
- Reimplementing Express middleware. Interop stays explicit and Node-only.

## Current state

The compensations are visible in `packages/adapter-express/src/adapter-express/micro-api/micro.ts`:

- **`finalize()` runs lazily on first request.** The 404 fallback and error handler used to be
  appended in `listen()`; serverless adapters consume `getApp()` and never listen, so both were
  dead on every edge target. Fixing it required a middleware whose only job is to mutate the
  stack mid-flight.
- **`expressotsAutoParser` stands down on serverless.** `express.json()` reaches for
  `req.socket` and throws on _every_ request — including GETs with no body — because the mock is
  not a `Readable`. The parsers are wrapped and skipped when `SERVERLESS_HOST_SETTING` is set.
- **Log buffering is disabled directly rather than through `AppExpress`,** because importing
  `AppExpress` "dragged the whole DI/full-framework stack into every micro build (141 KiB gzip on
  a Worker)".
- **The Worker config aliases `iconv-lite`** to a hand-written shim.

None of these are defects. They are correct fixes to real bugs. They are listed because each one
is the cost of maintaining a mock whose contract — "be a faithful `http.ServerResponse`" — has no
upper bound.

## Proposal

### 1. A runtime-neutral package: `@expressots/micro`

The router, middleware pipeline, error handling, RFC-7807 404 and suggestion engine move to a new
package with **zero `node:` imports**. Handler contract:

```ts
type Handler = (request: Request, ctx: RouteContext) => unknown;
```

A returned `Response` passes through untouched, which is what makes streaming fall out for free.
Anything else is coerced: `string` to `text/html`, `undefined` to 204, otherwise JSON.

**Why a separate package rather than a module inside `adapter-express`.** The 141 KiB regression
recorded in `micro.ts` was caused by one import reaching the DI stack. Shipping a
runtime-neutral core from a package whose entry point exports Express re-opens that failure mode
on every release, and defends against it only through reviewer vigilance. A package boundary makes
the constraint structural — a `node:` import becomes a build error rather than a bundle
regression noticed later.

### 2. `listen()` becomes a Node adapter

`@expressots/micro/node` converts `IncomingMessage → Request` and `Response → ServerResponse`.
This is the conversion in the correct direction: real streams into `ReadableStream`, instead of
today's synthesising of a stream that `body-parser` then rejects. Studio agent integration lives
here, being Node-only.

### 3. Edge adapters collapse

```ts
export default { fetch: app.handler };
```

`cloudflareAdapter` and the Vercel Edge adapter reduce to roughly that. Lambda keeps a small
event → `Request` shim.

### 4. Compatibility

`@expressots/adapter-express` re-exports `micro()` and the adapters, so existing imports keep
working unchanged. Express middleware remains supported on the Node target, where it has a real
stream. Registering stream-reading Express middleware on an edge target throws loudly — a
generalisation of the guard #951 already added.

### What this removes

The compensation layers stop being necessary rather than merely fixed: the lazy `finalize()`,
the parser stand-down and `SERVERLESS_HOST_SETTING`, and the `iconv-lite` alias.

## Compatibility surface and risk

This is the part that decides whether the work is a v4 minor or must wait for v5, and it is the
least certain section of this RFC.

The public surface of `micro()` is preserved. The exposure is handlers reaching for Express
members on `req`/`res` that a fetch-native context does not have:

| Express usage                | Fetch-native equivalent             | Mitigation                           |
| ---------------------------- | ----------------------------------- | ------------------------------------ |
| `res.status(201).json(x)`    | `Response.json(x, { status: 201 })` | Compat shim on `ctx`                 |
| `res.send(...)`              | return the value                    | Compat shim                          |
| `req.params.id`              | `ctx.params.id`                     | Shim, or accept as breaking          |
| `req.query.a` with brackets  | `ctx.query` (`URLSearchParams`)     | `qs`-compatible parser, opt-in       |
| `req.body`                   | `await request.json()`              | Shim populating `ctx.body`           |
| Arbitrary Express middleware | not portable                        | Node target only; loud error on edge |

The unknown is how many real applications use `res`/`req` directly inside `micro()` handlers
rather than returning values. The auto-send design encourages returning, which is the reason to
think exposure is small — but that is a belief, not a measurement, and it should be checked
against the templates and examples before this is scheduled.

## Sequencing

1. Land `@expressots/micro` with the neutral router and a test suite run against both Node and
   workerd targets.
2. Port `cloudflareAdapter` to `{ fetch: app.handler }`, keeping the existing adapter until the
   new path passes the same suite.
3. Re-point `micro()` in `adapter-express` at the new core behind its existing surface.
4. Vercel and Lambda.
5. Remove the compensation layers once nothing depends on them.

Steps 1 and 2 are independently useful and independently revertable. Nothing here blocks #946 or
the remainder of #945.

## Testing strategy

Acceptance criterion #4 of #947 — one suite proving both targets behave identically — becomes the
central mechanism rather than a final check. The same spec file runs twice: once against the Node
adapter, once on workerd via `@cloudflare/vitest-pool-workers`. Divergence becomes a failing
test instead of a field report. The prototype's eight tests are the seed of that suite.

The bundle gate from #962 already enforces size thresholds in CI and extends to the 100 KB
criterion directly.

## Open questions

1. **Package name and scope.** `@expressots/micro` is the working name. Should the neutral core
   also host the gateway, service-mesh and queue modules currently under `micro-api/`, or do
   those stay Express-bound?
2. **How far does the compat shim go?** A thin `ctx.res`-like object covering `status`/`json`/
   `send` would make most handlers portable unchanged, at some bundle cost. Where is the line?
3. **v4 minor or v5?** Depends entirely on the compatibility survey above.
4. **Does `qs`-compatible query parsing belong in the core** or as an opt-in import? It is the
   single largest behavioural difference between `URLSearchParams` and Express.

## Decision requested

Whether to proceed with the extraction as described, and if so whether it targets a v4 minor or
v5. The measurements establish the payoff is real and large. The judgement call is whether the
compatibility exposure in `micro()` handlers is small enough to absorb in v4 — which needs the
survey in the compatibility section before it can be answered responsibly.

## Appendix: reproducing the measurements

- Baseline: the `base` scenario of `pnpm --filter @expressots/adapter-express test:cloudflare:bundle`
  (added in #962), reported as `baseGzip`.
- Prototype: `wrangler deploy --dry-run --outdir=dist` against a config with no
  `compatibility_flags`, gzip reported by Wrangler as `Total Upload`.
- Builtin list: the same build against `micro()` with `nodejs_compat` removed, collecting the
  distinct `node:*` packages Wrangler reports as unresolved.
