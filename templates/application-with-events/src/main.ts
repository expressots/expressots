import { bootstrap, loadEnvSync } from "@expressots/core";
import { App } from "./app";
import { appConfig } from "@config/app.config";

// `loadEnvSync()` always loads `.env` first, then layers the
// environment-specific file `.env.${NODE_ENV}` on top (e.g.
// `.env.production`, `.env.test`). To override that mapping pass
// `{ files: { production: ".env.prod" } }`. See:
// https://expresso-ts.com/docs/features/configuration#env-files
loadEnvSync();

void bootstrap(App, {
    port: appConfig.values.app.port,
});
