## Unreleased

### BREAKING CHANGES

* remove the `utils` module (`Compiler` and the chalk-based logger printers). The `Compiler` config loader now lives in `@expressots/cli` (`src/utils/compiler.ts`); the logger printers were never exported from the package barrel. The internal dotenv `log` helper moved to `src/env/logger.ts` and is unchanged.
* drop the `chalk` runtime dependency and the optional `ts-node` peer dependency; both were only used by the removed utils module.
* require Node.js `>=20.19.0` (was `>=20.18.0`).

### Build System

* enable `strictNullChecks` and `noImplicitAny`; remove unused `experimentalDecorators` / `emitDecoratorMetadata`; CJS build now compiles with `module: node16` / `moduleResolution: node16` and an explicit `rootDir`.

### Continuous Integrations

* remove the `pull_request_target` trigger from the build workflow.

### Bug Fixes

* resolve js-yaml advisory and remove clear-text logging of env values ([b56bc02](https://github.com/expressots/shared/commit/b56bc02))
* bump undici to 7.28.0 and regenerate `package-lock.json` with npm 10 to resolve Dependabot alerts ([ba875c4](https://github.com/expressots/shared/commit/ba875c4), [8c9b3d8](https://github.com/expressots/shared/commit/8c9b3d8))

### Tests

* cover `Pattern` enum and config vault fallback paths ([cb6fa84](https://github.com/expressots/shared/commit/cb6fa84))

## [4.0.0-preview.3.4](https://github.com/expressots/shared/compare/v4.0.0-preview.3.3...v4.0.0-preview.3.4) (2026-06-13)

* version-only release to keep the v4 preview bundle aligned across packages.

## [4.0.0-preview.3.3](https://github.com/expressots/shared/compare/4.0.0-preview.3.2...v4.0.0-preview.3.3) (2026-06-10)

* version-only release to keep the v4 preview bundle aligned across packages.

## [4.0.0-preview.3.2](https://github.com/expressots/shared/compare/v4.0.0-preview.3.1...4.0.0-preview.3.2) (2026-06-06)

### Build System

* add `prepublishOnly` guard (`scripts/release/guard-no-file-deps.mjs`) that blocks publishing with `file:` dependencies.

## [4.0.0-preview.3.1](https://github.com/expressots/shared/compare/v4.0.0-preview.3...v4.0.0-preview.3.1) (2026-06-06)

### Documentation

* refresh README badges and links.
* add GitHub issue templates (bug report, feature request, documentation, community ideas) and template chooser config.

### Continuous Integrations

* add ExpressoTS Project sync workflow.

## [4.0.0-preview.3](https://github.com/expressots/shared/compare/3.0.0...4.0.0-preview.3) (2026-05-25)

Part of the ExpressoTS **v4.0.0 preview bundle**. See the [v4.0.0 release notes](https://expresso-ts.com/docs/4.0.0/prologue/release) and the [upgrade guide](https://expresso-ts.com/docs/4.0.0/prologue/upgrade_guide) for the full picture.

### Features

* extend `ExpressoConfig` with `scaffoldSchematics` covering all v4 schematics (`controller`, `usecase`, `dto`, `module`, `provider`, `entity`, `middleware`, `interceptor`, `event`, `handler`, `guard`, `config`).
* add type-safe `Pattern` enum (regular `enum`, not `const enum`, so consumers compiling with `isolatedModules: true` such as Vite/Vitest/esbuild/SWC can import it).
* expose shared content-negotiation primitives consumed by `@expressots/core` formatters.
* add `Env.when(condition, value, fallback)` helper for environment-specific config resolution.
* publish dual ESM + CJS builds with subpath exports for both module systems.
* declare `engines.node: ">=20.18.0"`.

### Bug Fixes

* tighten the `IWebServer` / `IWebServerBuilder` typings so v4 adapters can declare their server contract without leaking Express types.
* `configDotenv()` is now safe to call with no arguments — null-guard added on `options.encoding` / `options.debug` (previously threw `TypeError: Cannot read properties of undefined`).

### Build System

* bump dev toolchain to TypeScript 5.5, ESLint 8.57, Jest 29.7, Prettier 3.5.

## [3.0.0](https://github.com/expressots/shared/compare/3.0.0-beta.3...3.0.0) (2024-12-04)


### Features

* refactor IWebServer interface, add IWebServerBuilder ([9a23fff](https://github.com/expressots/shared/commit/9a23fff1e7de8d3880ed90317ffde1037ef1947b))
* update initEnvironment method to return a Promise for better async handling ([6ae9525](https://github.com/expressots/shared/commit/6ae9525b5497dacf81c1861e467bf6e27421ad2e))

## [3.0.0](https://github.com/expressots/shared/compare/3.0.0-beta.3...3.0.0) (2024-12-03)


### Features

* refactor IWebServer interface, add IWebServerBuilder ([9a23fff](https://github.com/expressots/shared/commit/9a23fff1e7de8d3880ed90317ffde1037ef1947b))

## [3.0.0-beta.3](https://github.com/expressots/shared/compare/0.3.0...0.4.0) (2024-11-28)

### Features

- add close method to Server interface for graceful shutdown ([7d0cd8f](https://github.com/expressots/shared/commit/7d0cd8f1e05c5fed96e74b01dc715e5c7eb268d0))

## [0.3.0](https://github.com/expressots/shared/compare/0.2.0...0.3.0) (2024-11-24)

### Features

- add entryPoint property to ExpressoConfig interface ([324ac37](https://github.com/expressots/shared/commit/324ac37a7d407c491881998c6ed3288e04a0ae39))

## [0.2.0](https://github.com/expressots/shared/compare/0.1.0...0.2.0) (2024-11-16)

### Features

- add interfaces for console, middleware, and environment; update index exports ([30d7dbb](https://github.com/expressots/shared/commit/30d7dbb0c24af12e4537f626be816f2f5d8a81a0))

### Bug Fixes

- standardize quotes in middleware interface file ([6b3f045](https://github.com/expressots/shared/commit/6b3f0459c3ba0bf58d1de920335c6ef7dd438e32))

### Tests

- enhance coverage for configDotenv function and add edge case handling ([58612bd](https://github.com/expressots/shared/commit/58612bd0040b592133bac687cfb29b9c6ece2a94))

## 0.1.0 (2024-11-10)

### Features

- add compiler and package definitions ([8352e66](https://github.com/expressots/shared/commit/8352e663c1a3429c70bbf7588380fe92f547e0a9))
- add early ai unit test generation and code coverage ([7eb5f38](https://github.com/expressots/shared/commit/7eb5f380f6b49ce6316a9749daaa7311fda74f04))
- add env and compiler modules ([f93f6c3](https://github.com/expressots/shared/commit/f93f6c3a719d1a1129112bee4e5e9cf6e42ddd89))
- add global config interface ([cbe2e12](https://github.com/expressots/shared/commit/cbe2e127db006273e9049220fe3ed20b964d697b))
- change to beta version ([4e835ca](https://github.com/expressots/shared/commit/4e835ca58933336bc78d66fb42935bf4d02ec641))
- update readme to include badges ([5995b1a](https://github.com/expressots/shared/commit/5995b1a3eab1481aa4552ca76683c6b16ae0dc60))

### Bug Fixes

- add express config file for testing ([d7ae7e1](https://github.com/expressots/shared/commit/d7ae7e1d91a73965be89a9f96df4dfdbc67575d4))
- change dependency installation from npm ci to npm install in CI workflow ([6bc1ece](https://github.com/expressots/shared/commit/6bc1ece4da3c9aca717e769a8d2f615058652579))
- remove compiler load lib ([c8f6085](https://github.com/expressots/shared/commit/c8f6085ffdd2af524522174789cfe51203827bbb))
- reorder build and test steps in CI workflow; update Jest config to ignore specific paths ([4500863](https://github.com/expressots/shared/commit/45008637af232929c8c20df24c3cf4d6b56a082e))
- update CI workflow to use npm ci for dependency installation; refine Jest configs ([356c232](https://github.com/expressots/shared/commit/356c232bbfcf6bad7254ee0ab3417fd82f831a9f))
- update package.json to use exact version numbers for dependencies ([7cdd924](https://github.com/expressots/shared/commit/7cdd924b468af56ccf5bdfaa36b7cad82034e007))

### Code Refactoring

- remove unused env property from ExpressoConfig interface ([97663e8](https://github.com/expressots/shared/commit/97663e8a386ece45111eba0c2f8b66d1eb9c90af))

## 0.0.1 (2023-09-05)

### Bug Fixes

- testing commitlint ([0e78653](https://github.com/expressots/<<repo_name>>/commit/0e786539402f69fdca3fe5b684d850e523db7698))
