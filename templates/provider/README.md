<a name="readme-top"></a>

<!-- PROJECT SHIELDS -->
![Build][build-shield]
[![Contributors][contributors-shield]][contributors-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://expresso-ts.com/">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="Logo" width="120">
  </a>

  <h3 align="center">ExpressoTS Provider Template</h3>

  <p align="center">
    Scaffold for building reusable, DI-friendly providers for the ExpressoTS v4 ecosystem.
    <br />
    <a href="https://expresso-ts.com/docs/4.0.0/cli/providers"><strong>Provider CLI docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/expressots/expressots/discussions">Discuss</a>
    ·
    <a href="https://github.com/expressots/expressots/issues">Report Bug</a>
    ·
    <a href="https://github.com/expressots/expressots/issues">Request Feature</a>
  </p>
</div>

---

## About

A provider is a reusable building block that other ExpressoTS applications can install with `expressots add` and then `@inject()` from the DI container. This template gives you:

- **Dual ESM + CJS build** out of `lib/esm` and `lib/cjs`, with subpath `exports` for both module systems.
- **Decorated sample provider** (`GreeterProvider`) with a passing Jest suite.
- **release-it** + conventional commits + a GitHub release flow.
- **husky** + commitlint pre-configured.
- Requires `@expressots/core` 4.x; `package.json` pins the current 4.x release, and you can widen it to a peer range when publishing.

## Quick start

```bash
npx degit expressots/templates/provider my-provider
cd my-provider
npm install
npm test
```

Rename `name`, `description`, `repository`, `bugs`, and `homepage` in `package.json` before publishing.

## Project layout

```
src/
├── greeter.provider.ts     # Sample @provide() class — replace with your own
└── index.ts                # Public surface

test/
└── greeter.provider.spec.ts

scripts/                    # Build helpers (rm, copy) used by the npm scripts
tsconfig.json               # Base TypeScript config
tsconfig.cjs.json           # CommonJS build (outputs lib/cjs)
tsconfig.esm.json           # ESM build (outputs lib/esm)
```

## Building a provider

Providers are plain TypeScript classes decorated with `@provide()`. Consumers `@inject()` them from the container, so anything you can express with constructor parameters is fair game.

```ts
import { provide, inject } from "@expressots/core";

@provide(MyProvider)
export class MyProvider {
    constructor(@inject(SomeDependency) private readonly dep: SomeDependency) {}

    doWork() {
        return this.dep.run();
    }
}
```

Common provider shapes:

| Shape                          | Example                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| Plain helper / SDK wrapper     | The sample `GreeterProvider` in this template.                 |
| Adapter to an external service | Database client, queue client, SDK wrapper.                    |
| Cross-cutting concern          | Logger transport, cache, feature-flag provider.                |
| Configuration                  | A wrapper around `defineConfig` exposing a typed values bag.   |

Lifecycle is supported via the core decorators when you need it:

```ts
import { provide, postConstruct, preDestroy } from "@expressots/core";

@provide(DbClient)
export class DbClient {
    @postConstruct()
    async connect() {
        // open the connection once the container resolves the instance
    }

    @preDestroy()
    async disconnect() {
        // close when the container disposes
    }
}
```

## Scripts

| Script               | What it does                                                 |
| -------------------- | ------------------------------------------------------------ |
| `npm run build`      | Cleans `lib/`, builds the CJS bundle, copies `package.json` + `README.md` + `CHANGELOG.md`. |
| `npm run build:cjs`  | CJS build only.                                              |
| `npm run build:esm`  | ESM build only.                                              |
| `npm run release`    | release-it release flow (tag, GitHub release, CHANGELOG bump). |
| `npm run prepublish` | `build` + `npm pack` — produces the `.tgz` you can publish.  |
| `npm test`           | Jest test suite.                                             |
| `npm run coverage`   | Jest with `--coverage`.                                      |
| `npm run lint:fix`   | ESLint with `--fix`.                                         |
| `npm run format`     | Prettier formatting for `src/`.                              |

## Publishing

```bash
npm run build
npm publish --access public
```

If you want release-it to automate this, run `npm run release` and follow the prompts. The GitHub release step requires `GITHUB_TOKEN` in your environment.

## Installing in an app

In a consuming v4 app, run:

```bash
expressots add @your-scope/my-provider
```

Then bind it inside a module or inject it directly:

```ts
import { CreateModule } from "@expressots/core";
import { MyProvider } from "@your-scope/my-provider";

const MyModule = CreateModule([MyProvider]);
```

## Contributing

PRs against this template repo are welcome. For changes inside a published provider, follow that provider's `CONTRIBUTING.md`.

- [ExpressoTS Contributing Guidelines](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md)
- [Coding Guidelines](https://github.com/rsaz/TypescriptCodingGuidelines)

## Support the project

ExpressoTS is an independent open-source project. If this template helps you, please consider:

- Sponsoring us on **[GitHub Sponsors](https://github.com/sponsors/expressots)**
- Starring the **[organization repos](https://github.com/expressots)**
- Joining our **[Discord](https://discord.com/invite/PyPJfGK)**
- Contributing **[issues and pull requests](https://github.com/expressots/expressots/issues)**
- Sharing the project with your team

## License

MIT — see [LICENSE](./LICENSE.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[build-shield]: https://img.shields.io/github/actions/workflow/status/expressots/templates/build.yaml?branch=main&style=for-the-badge&logo=github
[contributors-shield]: https://img.shields.io/github/contributors/expressots/templates?style=for-the-badge
[contributors-url]: https://github.com/expressots/templates/graphs/contributors
[license-shield]: https://img.shields.io/github/license/expressots/templates?style=for-the-badge
[license-url]: https://github.com/expressots/templates/blob/main/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/company/expresso-ts/
