<div align="center">
  <a href="https://expresso-ts.com">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="ExpressoTS" width="120">
  </a>

  <h1>@expressots/adapter-express</h1>

  <p>Express HTTP adapter for ExpressoTS — connects the framework core to the Express.js server engine.</p>

  <p>
    <a href="https://www.npmjs.com/package/@expressots/adapter-express"><img src="https://img.shields.io/npm/v/@expressots/adapter-express?style=flat&color=0d0d0d" alt="npm"></a>
    <a href="https://github.com/expressots/adapter-express/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/expressots/adapter-express?style=flat&color=0d0d0d" alt="License"></a>
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
npm i @expressots/adapter-express
```

## What This Package Does

This adapter bridges ExpressoTS Core and Express.js. It provides the HTTP server implementation, route registration, middleware pipeline, and the `App` class that wires everything together. Install it alongside `@expressots/core` to run ExpressoTS on Express.

## Quick Look

```typescript
import { ExpressAdapter } from "@expressots/adapter-express";

// Used as the server adapter when bootstrapping your ExpressoTS application
const app = await AppFactory.create(App, ExpressAdapter);
await app.listen(3000, "development");
```

## Documentation

For guides, API reference, architecture patterns, and examples visit **[doc.expresso-ts.com](https://doc.expresso-ts.com)**.

## Contributing

See the [Contributing Guide](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md) for how to get involved.

## Support

- [GitHub Sponsors](https://github.com/sponsors/expressots)
- [Discord](https://discord.com/invite/PyPJfGK)
- [Report an Issue](https://github.com/expressots/adapter-express/issues)

## License

MIT — see [LICENSE](./LICENSE.md).
