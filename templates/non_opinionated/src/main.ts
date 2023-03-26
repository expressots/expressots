import "reflect-metadata";

import { AppInstance, ServerEnvironment } from "@expressots/core";
import { container } from "./app-container";

export async function bootstrap() {
    const app = AppInstance.create(container);
    app.listen(3000, ServerEnvironment.Development);
}

bootstrap();
