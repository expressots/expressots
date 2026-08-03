---
"@expressots/cli": patch
---

Bump `degit` from 2.8.4 to 2.8.6, resolving GHSA-77c7-pq4r-6mcq / CVE-2026-11572
(command injection via unsanitised `child_process.exec` in `_cloneWithGit()` and
`fetchRefs()`). 2.8.6 switches those call sites to `execFile`, removing the shell.

The CLI's own usage was not exploitable: both `degit()` call sites hardcode the
`expressots/templates` repository, so the only value reaching an exec sink
(`repo.url`) was never user-controlled, and the user-supplied
`EXPRESSOTS_TEMPLATE_REF` ref is only ever compared in JS, never interpolated
into a command. This bump clears the advisory for downstream scanners.
