import { AppContainer } from "@expressots/core";
import { PingModule } from "./controllers/ping.module";

const appContainer = new AppContainer();

const container = appContainer.create([
    // Add your modules here
    PingModule
]);

export { container };