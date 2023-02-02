import "reflect-metadata";

import { container } from "@providers/core/server/Container.Provider";
import { ServerProvider } from "@providers/core/server/Server.Provider";
import { Env } from "env";


async function Boostrap() {
    const app = await ServerProvider.Create(container);
    app.Listen(Env.Server.DEFAULT_PORT);
}

Boostrap();
