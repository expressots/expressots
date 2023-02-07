import { AppContainer } from "@expressots/core/";
import { BaseRouterContainerModule } from "./providers/default-route/default-route.module";
import { UserModule } from "./useCases/user/user.module";

const appContainer = new AppContainer();

const container = appContainer.create([
    // Add your modules here
    BaseRouterContainerModule,
    UserModule
]);

export { container };