---
"@expressots/adapter-express": minor
---

Add typed Cloudflare binding providers to the micro API.

`cloudflareBindings<Env>()` creates tokens for KV, D1, R2 and Queue bindings
that route handlers resolve with `req.services.get(token)`, typed from the
Worker's own `Env`. `micro()` and `cloudflareAdapter()` accept the request
type as a generic (`micro<CloudflareRequest<Env>>()`), so handlers see
`req.cloudflare.env` and `req.services` without casts. Values are resolved
from the current request's environment on every call; nothing is cached at
module scope. A binding missing from the environment raises
`CloudflareBindingNotFoundError` with a stable `code`.
