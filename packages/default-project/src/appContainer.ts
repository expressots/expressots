import { AppContainer } from "@expressots/core/";
import { BaseRouterContainerModule } from "./providers/default-route/default-route.module";

const appContainer = new AppContainer();

const container = appContainer.create([
    // Add your modules here
    BaseRouterContainerModule
]);

export { container };