import "reflect-metadata";

import { AppInstance, ServerEnvironment } from "@expressots/core";
import { container } from "./app.container";

export async function bootstrap() {
    AppInstance.create(container);
    AppInstance.listen(3000, ServerEnvironment.Development);
}

bootstrap();
