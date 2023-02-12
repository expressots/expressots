import { buildProviderModule } from "inversify-binding-decorators";
import { Container } from "inversify";
import { UserContainerModule } from "@useCases/user/User.Module";

const container = new Container();

container.load(
    buildProviderModule(),
    UserContainerModule
);

export { container };