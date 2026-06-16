<div align="center">
  <a href="https://expresso-ts.com">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="ExpressoTS" width="120">
  </a>

  <h1>@expressots/core</h1>

  <p>A TypeScript + Node.js framework for building scalable, easy to read and maintain server-side applications.</p>

  <p>
    <a href="https://www.npmjs.com/package/@expressots/core"><img src="https://img.shields.io/npm/v/@expressots%2Fcore?style=flat-square&color=181717&logo=npm&logoColor=white" alt="npm"></a>
    <a href="https://github.com/expressots/expressots/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/expressots/expressots?style=flat-square&color=181717" alt="License"></a>
    <a href="https://discord.com/invite/PyPJfGK"><img src="https://img.shields.io/badge/Discord-join-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a>
    <a href="https://github.com/expressots/expressots/actions"><img src="https://img.shields.io/github/actions/workflow/status/expressots/expressots/build.yml?branch=main&style=flat-square&logo=github&label=build" alt="Build"></a>
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
npm i @expressots/core
```

## What This Package Does

ExpressoTS Core is the foundation of the framework. It provides dependency injection, routing, middleware orchestration, lifecycle hooks, interceptors, guards, error handling, and the application bootstrap. Everything needed to structure and run a server-side TypeScript application with minimal boilerplate.

## Quick Look

```typescript
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

Welcome to the ExpressoTS community. See the [Contributing Guide](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md) for how to get involved.

## Support the project

- [GitHub Sponsors](https://github.com/sponsors/expressots)
- [Star the organization](https://github.com/expressots) on GitHub
- [Discord](https://discord.com/invite/PyPJfGK)
- [Report an issue](https://github.com/expressots/expressots/issues)

## License

MIT. See [LICENSE](./LICENSE.md).

