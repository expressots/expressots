import "reflect-metadata";

import { appConfig } from "AppConfig";
import { Env } from "Env";
import { ServerInversifyContainer } from "@providers/inversify/Container.Provider";

const PORT = Env.Server.DEFAULT_PORT;

appConfig.listen(PORT, async () => {
    ServerInversifyContainer.Init({
        appName: Env.Server.APP_NAME,
        appVersion: Env.Server.APP_VERSION,
        timezone: Env.Server.TIMEZONE,
        adminEmail: Env.Server.ADMIN_EMAIL,
        language: Env.Server.DEFAULT_LANGUAGE,
        environment: Env.Server.ENVIRONMENT,
        port: PORT
    });
});