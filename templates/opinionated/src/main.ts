import "reflect-metadata";

import { ServerEnvironment } from "@expressots/core";
import { App } from "@providers/application/application";
import ENV from "./env";
import { container } from "app-container";

async function Bootstrap() {
  const app = App.create(container);
  app.listen(ENV.Application.PORT, ServerEnvironment[ENV.Application.ENVIRONMENT], {
    appName: ENV.Application.APP_NAME,
    appVersion: ENV.Application.APP_VERSION,
  });
}

Bootstrap();
