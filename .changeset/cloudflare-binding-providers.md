---
"@expressots/adapter-express": patch
---

Add typed, request-local Cloudflare binding providers for KV, D1, R2 and
Queue producers.

`cloudflareBindings<Env>()` creates exactly typed tokens that handlers resolve
through `req.services`. The feature is opt-in, keeps `req.cloudflare.env`
compatible, and creates its ExpressoTS container only when a route requests a
binding.
