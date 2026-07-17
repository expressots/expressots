# Agent instructions

ExpressoTS v4 application (opinionated layout). TypeScript, Express 5 under the hood.

## Entry points

- `src/main.ts`: `loadEnvSync()` then `bootstrap(App)` from `@expressots/core`.
- `src/app.ts`: `class App extends AppExpress` (from `@expressots/adapter-express`).
  Registers modules via `CreateModule([...])` from `@expressots/core`.
  Lifecycle hooks: `globalConfiguration`, `configureServices`,
  `postServerInitialization`, `serverShutdown`.
- Controllers: `@controller`, `@Get`, `@Post`, etc. from `@expressots/adapter-express`.
- Injectable classes: `@provide()` from `@expressots/core`.
- `expressots.config.ts`: CLI config, typed by `@expressots/shared`.

## Commands

- `npm run dev`: dev server with reload.
- `npm run build` / `npm run prod`: compile to `dist/` and run it.
- `npm test`, `npm run lint`, `npm run format`.
- `npx expressots g <schematic> <name>`: generate code
  (service, controller, usecase, dto, module, provider, entity,
  middleware, interceptor, event, handler, guard, config).

## Layout

- Opinionated structure: controllers and usecases live under `src/useCases/<feature>/`
  when generated with `expressots g service`; shared code under `src/providers/`,
  `src/entities/`, `src/middleware/`, `src/interceptors/`, `src/events/`,
  `src/guards/`, `src/config/`.
- Path aliases (`@useCases/*`, `@providers/*`, `@entities/*`, `@middleware/*`,
  `@interceptors/*`, `@events/*`, `@guards/*`, `@config/*`) are declared in
  `tsconfig.json` and mirrored in `jest.config.ts`.
- New controllers/handlers must be registered in a module passed to
  `configContainer` in `src/app.ts` (or generated modules).
- Tests in `test/`, using `createTestApp` + `setupExpressoTSMatchers`
  from `@expressots/core`.

## Do not use v3 APIs

These were removed in v4. Never write or suggest:

- `AppFactory` (use `bootstrap(App)`).
- `BaseController` (controllers are plain classes with `@controller`).
- `IMiddleware` (use `this.Middleware` helpers or Express middleware directly).
- `ExpressoConfig` imported from `@expressots/core`
  (config types come from `@expressots/shared`).
