import { bootstrap, loadEnvSync } from "@expressots/core";
import { App } from "./app";
import { appConfig } from "@config/app.config";

// Load env files based on NODE_ENV (.env, .env.development, .env.production, .env.test).
// The first matching file wins; the process keeps whatever is already in process.env.
loadEnvSync({
    files: {
        development: ".env",
        production: ".env.prod",
        test: ".env.test",
    },
});

void bootstrap(App, {
    port: appConfig.values.app.port,
});
