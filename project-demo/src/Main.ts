import "reflect-metadata";

import { ServerProvider } from "@providers/core/server/Server.Provider";
import { container } from "AppContainer";
import { Env } from "env";


async function Boostrap() {
    const app = await ServerProvider.Create(container);
    app.Listen(Env.Server.DEFAULT_PORT);
}

Boostrap();
