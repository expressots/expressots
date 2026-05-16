import { bootstrap, loadEnvSync } from "@expressots/core";
import { App } from "./app";
import { appConfig } from "@config/app.config";

loadEnvSync();

void bootstrap(App, {
    port: appConfig.values.app.port,
});
