import "reflect-metadata";

import { AppFactory } from "@expressots/core";
import { container } from "./app.container";
import { ServerEnvironment } from "@expressots/adapter-express";

async function bootstrap() {
    const app = await AppFactory.create(container, []);
    await app.listen(3000, ServerEnvironment.Development);
}

bootstrap();
