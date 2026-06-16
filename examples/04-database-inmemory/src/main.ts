import { bootstrap, loadEnvSync } from "@expressots/core";
import { App } from "./app";

/**
 * Entry point.
 *
 * `loadEnvSync()` reads `.env` and layers `.env.${NODE_ENV}` (and the
 * `.local` overrides) on top before the rest of the runtime resolves
 * any environment variables. See `.env.example` for the variables this
 * template uses.
 *
 * `bootstrap(App)` builds the AppContainer, runs the `AppExpress`
 * lifecycle hooks (`globalConfiguration` → `configureServices` →
 * `postServerInitialization`), starts the HTTP server, and wires up
 * graceful shutdown on SIGINT / SIGTERM.
 *
 * See https://expresso-ts.com/docs/core/bootstrap for the full reference.
 */
loadEnvSync();

void bootstrap(App);
