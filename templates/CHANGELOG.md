## [4.0.0-preview.3] (2026-05-25)

Part of the ExpressoTS **v4.0.0 preview bundle**. See the [v4.0.0 release notes](https://expresso-ts.com/docs/4.0.0/prologue/release).

### Bundle

-   All scaffolds re-pin `@expressots/{core,adapter-express,shared,cli,studio,studio-agent}` to `4.0.0-preview.3` exact via the new `scripts/release/sync-template-deps.mjs` script. The root `package.json#version` is the single source of truth — `npm run release:sync-deps` rewrites every template before tagging.
-   `provider` scaffold no longer ships its own `npm run publish` script (the script overrode npm's own `publish` and clobbered dist-tags).
-   `application` and `application-with-events` and `micro` keep `express@5.2.1`, matching adapter-express's new `^5.1.0` requirement.
-   Templates are now consumed via the `expressots/templates#v<cli-version>` git tag rather than the `feature/v4.0` moving branch, so `expressots new` is reproducible across CLI releases.

## [4.0.0] (2026-05-12)

Part of the ExpressoTS **v4.0.0 release bundle**. See the [v4.0.0 release notes](https://expresso-ts.com/docs/4.0.0/prologue/release).

### `application` template

-   `bootstrap()` + `loadEnvSync` wiring in `src/main.ts`.
-   `AppExpress` lifecycle hooks stubbed in `src/app.ts` (`globalConfiguration`, `configureServices`, `postServerInitialization`, `serverShutdown`) with `setGlobalRoutePrefix("/api")`.
-   Minimal-by-design scaffold: `src/main.ts`, `src/app.ts`, `src/app.controller.ts`. Optional features (typed config via `defineConfig` + `Env.*`, interceptors, events) are added via `expressots generate` rather than shipped pre-wired.
-   `expressots.config.ts` declares every v4 schematic (`controller`, `usecase`, `dto`, `module`, `provider`, `entity`, `middleware`, `interceptor`, `event`, `handler`, `guard`, `config`).
-   Path aliases for every new scaffold folder in `tsconfig.json` / `tsconfig.build.json` / `jest.config.ts`.
-   `.env.example`, `package.json` with `@expressots/studio` + `@expressots/studio-agent` devDeps, modernized README.
-   Test file uses `expectBody` (partial matching) and covers the `/health` endpoint.

### `application-with-events` template

-   Same base as `application`, plus the type-safe Event Bus wired end-to-end: `setupEventSystemForExpress` in `configureServices` and a sample `UserCreatedEvent` + `WelcomeEmailHandler` under `src/events/`.

### `micro` template

-   `src/api.ts` keeps the single-file footprint; adds `/health`, configurable `PORT`, env-aware banner, `setErrorHandler`.
-   `examples/full-di-api.example.ts` rewritten to use `createMicroAPI()` correctly and point users at the `application` template for graduation.
-   `examples/README.md` + `README.md` rewritten with a decision matrix between `micro()`, `createMicroAPI()`, and `application`; serverless adapter coverage.
-   Adds `@expressots/studio` + `@expressots/studio-agent` devDeps and a `studio` npm script.
-   `test/api.spec.ts` covers `/` and `/health`.

### `provider` template

-   Replaces the empty placeholder with a real sample `GreeterProvider` decorated with `@provide()`.
-   Adds a passing Jest spec.
-   README rewritten as a provider-author guide: degit quick start, project layout, "Building a provider" section covering plain helpers / external-service adapters / cross-cutting concerns / configuration wrappers, lifecycle decorators, scripts, publishing, and how a consuming v4 app installs the provider via `expressots add`.

## [3.0.0]

### Bundle

-   migrate configuration imports to @expressots/shared and remove unused files (7f1510b)
-   remove 'reflect-metadata' type from TypeScript configuration (d13b684)
-   remove unused 'reflect-metadata' type from TypeScript configuration (c83e1ce)
-   rename AppController import and update App import path (c182833)
