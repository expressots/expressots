import "reflect-metadata";

import { ServerEnvironment } from "@expressots/core";
import ENV from "./env";
import { App } from "@providers/application/application";
import cors from "cors";
import { container } from "app-container";

async function Bootstrap() {
    const app = App.create(container, [cors({ origin: ENV.Cors.ORIGIN })]);
    app.listen(
        ENV.Application.PORT,
        ServerEnvironment[ENV.Application.ENVIRONMENT],
        {
            appName: ENV.Application.APP_NAME,
            appVersion: ENV.Application.APP_VERSION,
        },
    );
}

Bootstrap();
