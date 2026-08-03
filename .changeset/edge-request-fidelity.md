---
"@expressots/adapter-express": minor
"@expressots/cli": minor
---

Request fidelity on Cloudflare Workers, and Worker tests that run on workerd.

**Binary and multipart bodies survive intact (#949).** The adapter read every
body with `request.text()`, UTF-8 decoding arbitrary bytes — any invalid
sequence became `U+FFFD` and the original was unrecoverable, silently. File
uploads were impossible. Bodies are now read as bytes and only decoded when the
content type is textual; anything else reaches `req.body` as a `Buffer`.
`multipart/form-data` is parsed with the runtime's native `FormData`, with file
parts exposed as `{ filename, contentType, size, data }`.

**Duplicate and bracketed keys match Node (#949).** Query strings and
urlencoded bodies now go through `qs`, the parser
`express.urlencoded({ extended: true })` uses. Previously `?tag=a&tag=b` gave
`{ tag: "b" }` on Workers and `{ tag: ["a","b"] }` on Node, so the same handler
returned different data depending on where it was deployed. `qs` is already in
the Worker bundle via Express, so this costs no bundle size.

**Request bodies are capped (#949).** Bodies over 1 MiB are rejected with
**413**, checked against `content-length` before reading. A Workers isolate has
128 MB of memory and Cloudflare accepts bodies up to 100 MB, so an unbounded
read was an availability hazard. Configure with
`cloudflareAdapter(app, { maxBodySize })`; `0` disables it.

**Cloudflare scaffolds test on workerd, not Node (#952).** The target now
generates Vitest with `@cloudflare/vitest-pool-workers` instead of Jest, plus a
`vitest.config.mts` pointed at `wrangler.toml`, and specs that drive the Worker
through `SELF.fetch()`. Node-hosted tests were wrong in both directions:
`undici` omits `content-length`, so Express body middleware short-circuited and
a Worker that failed every request in production tested green; and `undici`
rejects a 204 response body that workerd accepts, so a correct endpoint failed
its own suite. The generated `tsconfig.json` moves to
`module: esnext` / `moduleResolution: bundler`, which a Workers project wants
anyway and which Node10 resolution could not provide.

**CLI: `expressots new` no longer crashes in a narrow terminal (#955).**
`centerText` passed a negative count to `" ".repeat()`, throwing a `RangeError`
_after_ the scaffold had completed and reported success — leaving a working
project alongside a stack trace and a non-zero exit code.

**Build: `turbo run build test` no longer races (#956).** The `test` task
declared only `^build` (upstream packages), so `@expressots/cli`'s tests could
spawn `bin/cli.js` while its own build was deleting that directory.
