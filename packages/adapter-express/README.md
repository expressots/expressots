<div align="center">
  <a href="https://expresso-ts.com">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="ExpressoTS" width="120">
  </a>

  <h1>@expressots/adapter-express</h1>

  <p>Express HTTP adapter for ExpressoTS. Connects the framework core to the Express.js server engine.</p>

  <p>
    <a href="https://www.npmjs.com/package/@expressots/adapter-express"><img src="https://img.shields.io/npm/v/@expressots%2Fadapter-express/next?style=flat-square&color=181717&logo=npm&logoColor=white" alt="npm"></a>
    <a href="https://github.com/expressots/adapter-express/blob/main/LICENSE.md"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square&color=181717" alt="License"></a>
    <a href="https://discord.com/invite/PyPJfGK"><img src="https://img.shields.io/badge/Discord-join-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a>
    <a href="https://github.com/expressots/adapter-express/actions"><img src="https://img.shields.io/github/actions/workflow/status/expressots/adapter-express/build.yaml?branch=main&style=flat-square&logo=github&label=build" alt="Build"></a>
  </p>

  <p>
    <a href="https://doc.expresso-ts.com">Documentation</a> ·
    <a href="https://doc.expresso-ts.com/docs/core/first-steps">Getting Started</a> ·
    <a href="https://github.com/orgs/expressots/projects/5">Project Board</a> ·
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
import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule, bootstrap } from "@expressots/core";
import { AppController } from "./app.controller";

export class App extends AppExpress {
  private readonly container: AppContainer = this.configContainer([
    CreateModule([AppController]),
  ]);

  async configureServices(): Promise<void> {
    // register middleware, interceptors, error handlers
  }
}

void bootstrap(App); // starts on process.env.PORT or 3000
```

`bootstrap()` builds the container, runs the `AppExpress` lifecycle hooks (`globalConfiguration`, `configureServices`, `postServerInitialization`), starts the HTTP server, and wires graceful shutdown on SIGINT / SIGTERM.

## Requirements

- Express 5 (the adapter targets the Express 5 API; body parsing uses the Express 5 native parsers)
- Node.js >= 20.19.0
- `@expressots/studio-agent` is an optional peer dependency: install it to enable ExpressoTS Studio integration, or omit it with no impact on the adapter.

## Preview modules

The `micro-api` module (gateway, service-mesh, serverless, queue) is preview quality: its APIs may change and it is not yet covered by the test suite. Use it for experimentation, not production-critical paths.

## Documentation

For guides, API reference, architecture patterns, and examples visit **[doc.expresso-ts.com](https://doc.expresso-ts.com)**.

## Contributing

Welcome to the ExpressoTS community. See the [Contributing Guide](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md) for how to get involved.

## Support the project

- [GitHub Sponsors](https://github.com/sponsors/expressots)
- [Star the organization](https://github.com/expressots) on GitHub
- [Discord](https://discord.com/invite/PyPJfGK)
- [Report an issue](https://github.com/expressots/adapter-express/issues)

## License

MIT. See [LICENSE](./LICENSE.md).

