---
"@expressots/adapter-express": patch
"@expressots/cli": minor
"@expressots/core": patch
---

Add Cloudflare Workers as a scaffold target for ExpressoTS micro projects,
including Wrangler configuration, runtime-aware documentation, and Worker
handler tests.

Harden Cloudflare request-body handling and keep path-alias registration
compatible with bundled ESM output.

Fixes #945. Thanks @xgame92 for the contribution.
