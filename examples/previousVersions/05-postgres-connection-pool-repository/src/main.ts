import "reflect-metadata";

import { ServerEnvironment } from "@expressots/adapter-express";
import { AppFactory } from "@expressots/core";
import { App } from "@providers/application/application.provider";
import { container } from "./app.container";

async function bootstrap() {
    const app = await AppFactory.create(container, App);
    await app.listen(3000, ServerEnvironment.Development);
}

bootstrap();
