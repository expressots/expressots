---
"@expressots/adapter-express": minor
---

Fix `createTestApp()` failing under Jest — the default scaffold's own test
suite did not pass.

`AppExpress.listen()` reaches `isPortAvailable()` and `killProcessOnPort()`,
which loaded `net`, `child_process` and `util` with `await import(...)`. In the
CJS build those compile to dynamic imports that Jest's VM cannot execute,
so any suite calling `createTestApp()` failed with:

```
TypeError: A dynamic import callback was invoked without --experimental-vm-modules
```

Since `createTestApp()` is the documented way to test an ExpressoTS app — and
the `application` template ships a spec that uses it — a freshly scaffolded
project failed `npm test` out of the box. Present in 4.1.1 and 4.2.0.

All three are Node built-ins with no reason to be lazy, and are now imported
statically. Twelve of the fifteen example projects went from a fully failing
suite to a fully passing one; all fifteen now pass.

Worker bundles are unaffected: `micro()` no longer imports `AppExpress`, so it
stays tree-shaken and `child_process` never reaches the edge build. Measured
unchanged at 202 KiB gzipped.
