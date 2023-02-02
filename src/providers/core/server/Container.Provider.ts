import { buildProviderModule } from "inversify-binding-decorators";
import { Container } from "inversify";
import { serverContainerModule, jwtContainerModule, userContainerModule } from "./ContainerModule.Provider";

const container = new Container();

container.load(
    buildProviderModule(),
    serverContainerModule,
    jwtContainerModule,
    userContainerModule
);

export { container };