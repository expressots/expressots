import { buildProviderModule } from "inversify-binding-decorators";
import { Container } from "inversify";
import { serverContainerModule, playerContContainerModule, jwtContainerModule } from "./ContainerModule.Provider";
import { ServerProvider } from "@providers/server/Server.Provider";

const container = new Container();

container.load(
    buildProviderModule(),
    serverContainerModule,
    playerContContainerModule,
    jwtContainerModule
);

export const ServerInversifyContainer = container.get<ServerProvider>(ServerProvider);

export { container };