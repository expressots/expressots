---
"@expressots/cli": minor
---

Alias `iconv-lite` out of Cloudflare Worker builds — roughly 195 KiB gzipped.

`express` imports `body-parser`, which imports `iconv-lite` to decode request
bodies in non-UTF-8 charsets. On Node it loads encoding tables through dynamic
`require`, so you pay only for what you use; a Workers build cannot do that, so
every table is bundled — including 424 KiB of CJK codecs.

None of it is reachable on this target. The adapter parses request bodies
itself and Express's body middleware is disabled, so body-parser's read path
never executes. The scaffold now generates `src/shims/iconv-lite.cjs` and
aliases the module to it.

The shim throws rather than returning plausible values: reaching it means
something is genuinely wrong on this runtime, and a named error is more useful
than silently mis-decoded bytes. It is CommonJS because `raw-body` and
`body-parser` reach it through `require()`, and an ESM shim breaks their
interop under Vitest.

The alias is declared in **both** `wrangler.toml` and `vitest.config.mts` —
the Vitest pool does not read `wrangler.toml`, and without the second entry the
suite would run against the real `iconv-lite` while the deployed Worker ran
against the stub.

Combined with the log-buffer extraction, a scaffolded Worker goes from
537.36 KiB gzipped to 202.14 KiB — a 62% reduction. Node projects and the
untargeted `micro` template are unaffected.
