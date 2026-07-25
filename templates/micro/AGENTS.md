# Agent instructions

ExpressoTS v4 micro API: single-file, functional style. No DI container by default.

## Entry points

- `src/api.ts` is the whole app: `micro()` from `@expressots/adapter-express`
  creates the app; routes are `app.get("/path", handler)`; errors via
  `app.setErrorHandler`; start with `app.listen(port, { appName, appVersion })`.
- Keep the single-file style. Add routes to `src/api.ts`; do not create
  controllers, modules, or usecases here.
- Need DI, `@provide` classes, `CreateModule`, or `AppExpress`? That is the
  `application` template; see `examples/full-di-api.example.ts` for the
  graduation path (or `createMicroAPI()` for a middle ground).
- `expressots.config.ts`: CLI config, typed by `@expressots/shared`.
- `examples/`: runnable extras (circuit breaker, service discovery,
  service client, serverless lambda). Run with `npm run example:<name>`.

## Commands

- `npm run dev`: dev server with reload.
- `npm run build` / `npm run prod`: compile to `dist/` and run it.
- `npm test`, `npm run lint`, `npm run format`.

## Config

- Env vars only: `PORT`, `NODE_ENV` (see `.env.example`).
- Tests in `test/`, spinning up the app with `micro()` directly.

## Do not use v3 APIs

These were removed in v4. Never write or suggest:

- `AppFactory` (v4 uses `micro()` here, or `bootstrap(App)` in full apps).
- `BaseController` (no controllers in this template at all).
- `IMiddleware` (use `app.use` with Express middleware).
- `ExpressoConfig` imported from `@expressots/core`
  (config types come from `@expressots/shared`).
