import "reflect-metadata";

import { container } from "./appContainer";
import { App } from "./providers/application/application";
import express from "express";

async function Bootstrap() {
    const app = App.create(container, [
        express.json(),
    ]);
    app.listen(3000);
}

Bootstrap();