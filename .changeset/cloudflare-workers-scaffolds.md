---
"@expressots/adapter-express": patch
"@expressots/cli": minor
"@expressots/core": patch
---

Add Cloudflare Workers as a scaffold target for ExpressoTS micro projects,
including Wrangler configuration, runtime-aware documentation, and Worker
handler tests. The target is selectable both with `--target cloudflare` and
from the interactive `expressots new` wizard when the micro template is
chosen.

Harden Cloudflare request-body handling and keep path-alias registration
compatible with bundled ESM output.

Cloudflare adapter request bodies are now parsed according to their content
type. JSON and URL-encoded bodies remain structured values, while text and
requests without a content type are passed to handlers as strings.

Partially addresses #945. Thanks @xgame92 for the contribution.
