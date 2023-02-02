import { buildProviderModule } from "inversify-binding-decorators";
import { Container } from "inversify";
import { jwtContainerModule, userContainerModule } from "./ContainerModule.Provider"; // serverContainerModule

const container = new Container();

container.load(
    buildProviderModule(),
    jwtContainerModule,
    userContainerModule
);

export { container };