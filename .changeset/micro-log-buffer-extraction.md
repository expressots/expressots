---
"@expressots/adapter-express": patch
---

Cut the full-framework stack out of `micro()` builds.

`micro()` called `AppExpress.disableBuffering()` — one static call, to turn off
the banner-first log buffering it does not use. Importing `AppExpress` for it
pulled in `inversify-express-server`, the DI container and `middleware-service`,
so every micro build carried the entire full-framework stack.

The buffering state machine moves to its own dependency-free module that both
`AppExpress` and `micro()` import. `AppExpress.startLogBuffering()` and
`AppExpress.disableBuffering()` keep working exactly as before — they now
delegate — so there is no public API change.

Measured on a scaffolded Cloudflare Worker:

```
before:  2428.83 KiB raw / 537.36 KiB gzip
after:   1713.68 KiB raw / 396.82 KiB gzip   (-26%)
```

Node applications are unaffected: the banner still renders before the buffered
startup logs flush, verified by booting the starter example.
