<div align="center">
  <a href="https://expresso-ts.com">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="ExpressoTS" width="120">
  </a>

  <h1>@expressots/core</h1>

  <p>A TypeScript framework for building server-side applications — fast to code, lean to run, simple to deploy.</p>

  <p>
    <a href="https://www.npmjs.com/package/@expressots/core"><img src="https://img.shields.io/npm/v/@expressots/core?style=flat&color=0d0d0d" alt="npm"></a>
    <a href="https://github.com/expressots/expressots/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/expressots/expressots?style=flat&color=0d0d0d" alt="License"></a>
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
npm i @expressots/core
```

## What This Package Does

ExpressoTS Core is the foundation of the ExpressoTS framework. It provides dependency injection, routing, middleware orchestration, lifecycle hooks, interceptors, guards, error handling, and the application bootstrap — everything needed to structure and run a server-side TypeScript application with minimal boilerplate.

## Quick Look

```typescript
// app.provider.ts
import { AppFactory } from "@expressots/core";
import { App } from "./app";

async function bootstrap() {
  const app = await AppFactory.create(App);
  await app.listen(3000, "development");
}

bootstrap();
```

## Documentation

For guides, API reference, architecture patterns, and examples visit **[doc.expresso-ts.com](https://doc.expresso-ts.com)**.

## Contributing

See the [Contributing Guide](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md) for how to get involved.

## Support

- [GitHub Sponsors](https://github.com/sponsors/expressots)
- [Discord](https://discord.com/invite/PyPJfGK)
- [Report an Issue](https://github.com/expressots/expressots/issues)

## License

MIT — see [LICENSE](./LICENSE.md).
