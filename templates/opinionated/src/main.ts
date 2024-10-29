import { AppFactory, ServerEnvironment } from "@expressots/core";
import { App } from "@providers/app/app.provider";
import { container } from "./app.container";

async function bootstrap() {
    const app = await AppFactory.create(container, App);
    await app.listen(3000, ServerEnvironment.Development);
}

bootstrap();
