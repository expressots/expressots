import { AppFactory } from "@expressots/core";
import { App } from "app";
import { env } from "env";

AppFactory.create(App).then((app) =>
    app.listen(env.App.Port, {appName: env.App.appName, appVersion: env.App.appVersion}));