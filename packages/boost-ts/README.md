<div align="center">
  <a href="https://expresso-ts.com">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="ExpressoTS" width="120">
  </a>

  <h1>@expressots/boost-ts</h1>

  <p>Utility patterns for TypeScript — match expressions, optionals, and more.</p>

  <p>
    <a href="https://www.npmjs.com/package/@expressots/boost-ts"><img src="https://img.shields.io/npm/v/@expressots/boost-ts?style=flat&color=0d0d0d" alt="npm"></a>
    <a href="https://github.com/expressots/boost-ts/blob/main/LICENSE"><img src="https://img.shields.io/github/license/expressots/boost-ts?style=flat&color=0d0d0d" alt="License"></a>
    <a href="https://discord.com/invite/PyPJfGK"><img src="https://img.shields.io/badge/Discord-join-0d0d0d?logo=discord&logoColor=white" alt="Discord"></a>
  </p>

  <p>
    <a href="https://doc.expresso-ts.com">Documentation</a> ·
    <a href="https://doc.expresso-ts.com/docs/core/first-steps">Getting Started</a> ·
    <a href="https://discord.com/invite/PyPJfGK">Community</a>
  </p>
</div>

---

## Install

```bash
npm i @expressots/boost-ts
```

## What This Package Does

Boost-TS is a standalone collection of TypeScript utility patterns. It currently includes a **match expression** (pattern matching for enums, numbers, booleans, ranges, and regex) and an **optional type** (`Some`/`None`). These can be used in any TypeScript project, with or without ExpressoTS.

## Quick Look

```typescript
import { match } from "@expressots/boost-ts";

const result = match(statusCode, {
  200: () => "OK",
  404: () => "Not Found",
  _:   () => "Unknown",
});
```

## Documentation

For the full API and usage patterns visit **[doc.expresso-ts.com](https://doc.expresso-ts.com)**.

## Contributing

See the [Contributing Guide](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md) for how to get involved.

## Support

- [GitHub Sponsors](https://github.com/sponsors/expressots)
- [Discord](https://discord.com/invite/PyPJfGK)
- [Report an Issue](https://github.com/expressots/boost-ts/issues)

## License

MIT — see [LICENSE](./LICENSE).
