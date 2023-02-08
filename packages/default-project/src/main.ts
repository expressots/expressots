import "reflect-metadata";

import { container } from "./app-container";
import { App } from "./providers/application/application";
import { ServerEnvironment } from "@expressots/core";
import ENV from "./env";

async function Bootstrap() {
    const app = App.create(container);
    app.listen(3000, 
        ServerEnvironment.Development,
        { appName: ENV.Application.APP_NAME, appVersion: ENV.Application.APP_VERSION}
        );
}

Bootstrap();