# ExpressoTS Application

A modern, type-safe Node.js backend powered by ExpressoTS v4.

This template is the recommended v4 starter for REST APIs. It is intentionally minimal: a bootstrap entry point, an `AppExpress` application class with all four lifecycle hooks stubbed out, a welcome controller, and a passing test suite. You grow it with the CLI generators.

What ships in the scaffold:

- `bootstrap()` entry in `src/main.ts` that loads env files with `loadEnvSync`.
- `src/app.ts` with the `AppExpress` lifecycle hooks (`globalConfiguration`, `configureServices`, `postServerInitialization`, `serverShutdown`) and a `/api` global route prefix.
- `src/app.controller.ts` with welcome and `/health` endpoints.
- Tests using `createTestApp` + `setupExpressoTSMatchers` with the fluent request DSL.
- TypeScript path aliases pre-declared for every v4 scaffold folder (`@useCases/*`, `@providers/*`, `@entities/*`, `@middleware/*`, `@interceptors/*`, `@events/*`, `@guards/*`, `@config/*`). The folders are created on demand by `expressots generate`.
- `expressots.config.ts` with the full `scaffoldSchematics` map so every generator knows where to place files.

Optional v4 features such as typed configuration (`defineConfig` + `Env.*`), interceptors, and the type-safe Event Bus are not pre-wired in this scaffold. Generate them with the CLI (`npx expressots g config`, `npx expressots g interceptor`, `npx expressots g event`) or see the docs linked below.

> Want the type-safe Event Bus example wired in from the start? Answer **Yes** to the "Include the type-safe Event Bus example?" prompt during `expressots new`, or pass `--events` (`-e`) on the command line to get the **application-with-events** variant.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template
cp .env.example .env

# 3. Run the dev server
npm run dev
```

Open <http://localhost:3000/api/> for the welcome payload, and <http://localhost:3000/api/health> for a basic health check.

## Project structure

```
src/
├── main.ts                            # Entry point: loadEnvSync() + bootstrap(App)
├── app.ts                             # AppExpress class: container + lifecycle hooks
├── app.controller.ts                  # Welcome + /health controller
test/
└── app.controller.spec.ts             # createTestApp + fluent request + ExpressoTS matchers
expressots.config.ts                   # CLI configuration: opinionated layout, full scaffoldSchematics
tsconfig.json / tsconfig.build.json    # TypeScript + opinionated path aliases
jest.config.ts                         # Jest + alias mapping
```

## Scripts

| Script           | What it does                                                            |
| ---------------- | ----------------------------------------------------------------------- |
| `npm run dev`    | Dev server with hot reload (`expressots dev`).                          |
| `npm run build`  | Compiles to `dist/`; rewrites `@alias/*` imports to relative paths.      |
| `npm run prod`   | Runs the compiled output with `node`.                                   |
| `npm test`       | Jest tests, one worker.                                                  |
| `npm run test:watch` | Jest in watch mode.                                                  |
| `npm run test:cov`   | Jest with coverage; same as `npm run coverage`.                      |
| `npm run lint`   | ESLint with auto-fix.                                                    |
| `npm run format` | Prettier write.                                                          |
| `npm run studio` | Launch [ExpressoTS Studio](https://expresso-ts.com/docs/studio/overview). |

## Environment files

`main.ts` calls `loadEnvSync()` (no arguments, convention by default). On every boot:

1. `.env` is loaded first as the base.
2. `.env.${NODE_ENV}` is layered on top when present (e.g. `.env.production`, `.env.test`).
3. `.env.local` and `.env.${NODE_ENV}.local` are loaded last for machine-only overrides; both are gitignored.

| `NODE_ENV`    | Files loaded (in order)               |
| ------------- | ------------------------------------- |
| `development` | `.env` then `.env.local`              |
| `production`  | `.env` then `.env.production` then `.env.production.local` |
| `test`        | `.env` then `.env.test` then `.env.test.local` |

`.env.example` lists the variables the template reads. Copy it to `.env` and adjust. To override the file mapping, pass `loadEnvSync({ files: { production: ".env.prod" } })`.

When you need typed, validated configuration on top of raw env vars, generate a config file (`npx expressots g config app`) and use `defineConfig` + `Env.*` from `@expressots/core`. See the [Configuration reference](https://expresso-ts.com/docs/features/configuration).

## Scaffolding

Generate every v4 resource type from the CLI. The template's `expressots.config.ts` already declares the full `scaffoldSchematics` map, so each command knows where to place files.

```bash
# Full vertical slice (controller + usecase + DTO + module wiring)
npx expressots g service users/create post

# Individual schematics
npx expressots g controller users
npx expressots g usecase users/find
npx expressots g dto users/create
npx expressots g interceptor Caching --priority 5
npx expressots g event UserUpdated
npx expressots g handler EmailNotifier --event UserUpdated
npx expressots g guard Admin
npx expressots g config feature-flags
```

See [`expressots generate`](https://expresso-ts.com/docs/cli/generate) for every schematic.

## Testing

Tests use `@expressots/core`'s built-in testing module (no separate `@expressots/testing` package):

```ts
import { createTestApp, setupExpressoTSMatchers } from "@expressots/core";

setupExpressoTSMatchers();

const testApp = await createTestApp(App, { env: { NODE_ENV: "test" } });

await testApp.request
    .get("/api/health")
    .expectStatus(200)
    .expectBodyContains({ status: "ok" })
    .execute();

await testApp.cleanup();
```

See [Testing](https://expresso-ts.com/docs/features/testing) for `mockProvider`, `loadTest`, `createTestDatabase`, `snapshotRequest`, and matchers.

## Studio

ExpressoTS Studio is enabled in development. Run:

```bash
npm run studio
```

The Studio UI opens at <http://localhost:3333> with the Status Dashboard, Architecture Map, Request Timeline, Live Logs, Error Inspector, Security view (supply-chain advisories with reachability scoring and one-click fixes), and API client. See [Studio Overview](https://expresso-ts.com/docs/studio/overview).

## Endpoints

| Method | Path           | Description           |
| ------ | -------------- | --------------------- |
| `GET`  | `/api/`        | Welcome payload       |
| `GET`  | `/api/health`  | Liveness + uptime     |

## Learn more

- [ExpressoTS Documentation](https://expresso-ts.com/docs/)
- [CLI reference](https://expresso-ts.com/docs/cli/overview)
- [Configuration](https://expresso-ts.com/docs/features/configuration) · [Interceptors](https://expresso-ts.com/docs/features/interceptors) · [Events](https://expresso-ts.com/docs/features/events) · [Lifecycle](https://expresso-ts.com/docs/core/lifecycle)
- [Studio](https://expresso-ts.com/docs/studio/overview)
- [GitHub](https://github.com/expressots)
- [Discord](https://discord.gg/PyPJfGK)
