---
"@expressots/core": minor
---

Help AI coding tools land on the v4 API.

- `AppFactory` is exported again as a compile-time tombstone: any call to
  `AppFactory.create()` fails to compile with a message that names the
  replacement, `await bootstrap(App)`, and throws the same message at runtime.
  It is marked `@deprecated` and will be removed in v5.
- `llms.txt` now actually ships in the package. It was listed in `files` but
  lived outside the package directory, so 4.2.1 published without it.
