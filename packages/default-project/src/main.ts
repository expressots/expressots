import "reflect-metadata";

import { container } from "./appContainer";
import { App } from "./providers/application/application";

async function Bootstrap() {
    const app = App.create(container);
    app.listen(3000);
}

Bootstrap();