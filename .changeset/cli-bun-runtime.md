---
"@expressots/cli": minor
---

`expressots dev` and `expressots prod` run the app with Bun when the project
uses Bun (a `bun.lock` is present) and the `bun` binary is installed:
`bun --watch` in dev, `bun <compiled entrypoint>` in prod. Node remains the
default otherwise. Override with `--runtime node|bun` or
`EXPRESSOTS_RUNTIME`.
