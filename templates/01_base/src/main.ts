import "reflect-metadata";

import { AppInstance, ServerEnvironment } from "@expressots/core";
import { container } from "./app-container";

async function Boostrap() {
    const app = AppInstance.create(container);
    app.listen(3000, ServerEnvironment.Development);
}

Boostrap();