---
"@expressots/adapter-express": minor
"@expressots/cli": patch
---

Serverless adapters: response fidelity, working lifecycle hooks, and a loud
guard for body-parsing middleware.

**Adapters accept a `MicroApp` directly.** `cloudflareAdapter(app)`,
`vercelAdapter(app)` and `awsLambdaAdapter(app)` now unwrap `getApp()` as well
as `getExpressApp()`. Passing a `MicroApp` previously handed Express an object
that was not an Express app, failing deep inside the router rather than at the
call site. `app.getApp()` keeps working.

**Response fidelity (#948).**

- Multiple `Set-Cookie` headers no longer collapse into one comma-joined value,
  which broke every cookie-based session. Cloudflare emits them via
  `Headers.append()`; Lambda emits them in `multiValueHeaders`.
- `res.statusCode = 201` is honoured on Cloudflare. It was tracked in a closure
  only `res.status()` wrote to, so direct assignment — ordinary Express, and
  what several third-party middlewares do internally — was silently dropped.
- 204/205/304 responses carry no body. Passing an empty Buffer is tolerated by
  workerd but throws under Node/undici, so a 204 endpoint passed in production
  and failed in its own Jest suite.

**`setErrorHandler` and the RFC-7807 404 work on serverless targets (#950).**
Both were installed inside `listen()`, which serverless adapters never call, so
`setErrorHandler` type-checked and did nothing. `micro()` now finalizes its
middleware stack on the first request, so hosting makes no difference.
Registration is idempotent, and the handler is resolved at request time so
`setErrorHandler` still takes effect if called late.

**Body-parsing middleware fails loudly instead of at runtime (#951).**
`micro()`'s auto-parsers stand down when a Cloudflare or Lambda adapter is
attached, so the default `micro()` config now works on Workers without
`autoParseJson: false`. Explicitly registering `express.json()`,
`express.urlencoded()`, `express.text()`, `express.raw()`, `multer()` or
`compression()` on those targets throws a named error at adapter construction —
which in a Worker is module scope, so it surfaces at `wrangler dev` startup
rather than as a 500 on every request.

`vercelAdapter` is deliberately exempt from that guard: Vercel supplies a real
Node request/response pair, so body parsers work there normally. Its error
responses no longer leak `err.message` to the client, matching the other
adapters.

The Cloudflare scaffold drops the now-unnecessary `autoParseJson: false` line,
and its README and `AGENTS.md` describe the constraint rather than the
workaround.
