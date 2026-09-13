<div align="center">
  <a href="https://expresso-ts.com">
    <img src="https://raw.githubusercontent.com/expressots/expressots/main/packages/core/media/expressots.png" alt="ExpressoTS" width="120">
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
  private readonly container: AppContainer = this.configContainer([CreateModule([AppController])]);

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

The `micro-api` module (gateway, service-mesh, serverless, queue) is preview quality: its APIs may change. Use it for experimentation, not production-critical paths.

### Cloudflare binding providers

On Cloudflare Workers, a micro app can resolve its bindings (KV, D1, R2, Queues) through typed tokens instead of reading `env` by name in every handler:

```ts
import {
  cloudflareAdapter,
  cloudflareBindings,
  type CloudflareRequest,
  micro,
} from "@expressots/adapter-express";

interface Env {
  SETTINGS: KVNamespace;
  DB: D1Database;
}

const bindings = cloudflareBindings<Env>();
const Settings = bindings.kv("SETTINGS");
const Database = bindings.d1("DB");

const app = micro<CloudflareRequest<Env>>({ showBanner: false, studio: { enabled: false } });

app.get("/theme", async (req) => ({
  theme: await req.services.get(Settings).get("theme"),
}));

app.get("/items", (req) => req.services.get(Database).prepare("SELECT * FROM items").all());

export default cloudflareAdapter<Env>(app);
```

- `bindings.kv`, `bindings.d1`, `bindings.r2` and `bindings.queue` return frozen tokens, memoized by kind and name. Tokens carry only a name and a kind, so creating them at module scope is safe on Workers.
- `req.services.get(token)` reads the binding from the current request's `env` every time; nothing is cached across requests. `req.services.has(token)` reports whether the binding is present. `req.cloudflare.env` remains available for direct access.
- A binding absent from `env` raises `CloudflareBindingNotFoundError` (`code: "EXPRESSOTS_CLOUDFLARE_BINDING_NOT_FOUND"`), which flows through the app's error handler like any other error. Inherited object properties such as `toString` are never treated as bindings.
- Binding kinds are matched structurally against Cloudflare's runtime interfaces (for example, a KV namespace is recognised by `getWithMetadata`). With an explicit `Env`, each factory accepts only the names whose value matches its kind, and a value matching more than one kind is rejected as ambiguous. Without an `Env` type, any string is accepted, for applications whose bindings are configured dynamically.

The providers are verified inside workerd against Miniflare's KV, D1, R2 and Queue implementations, and a bundle gate keeps their cost under 1 KiB gzip; both run in CI from `test/cloudflare-bindings-worker`.

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
