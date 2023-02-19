import "reflect-metadata";

import { ServerEnvironment } from "@expressots/core";
import { container } from "./app-container";
import ENV from "./env";
import { App } from "./providers/application/application";

async function Bootstrap() {
  const app = App.create(container);
  app.listen(3000, ServerEnvironment.Production, {
    appName: ENV.Application.APP_NAME,
    appVersion: ENV.Application.APP_VERSION,
  });
}

Bootstrap();
