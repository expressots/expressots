import { AppContainer } from "@expressots/core/";

const appContainer = new AppContainer();

const container = appContainer.create([
    // Add your modules here

]);

export { container };