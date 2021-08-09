import "reflect-metadata";

import { app } from "./app";
import { Env } from "./env";
import { server } from '@providers/inversify/Container'

const port = Env.Express.PORT;

app.listen(port, async() => {
    server.logMessages({
        port: port!,
        appName: Env.Server.APP_NAME!,
        timezone: Env.Server.TIMEZONE!,
        adminEmail: Env.Support.ADMIN_EMAIL!,
        language: Env.Server.LANGUAGE!,
        environment: Env.Server.MODE!
    });
});

