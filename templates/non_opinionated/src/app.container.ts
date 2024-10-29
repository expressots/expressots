import { AppContainer } from "@expressots/core";
import { AppModule } from "./app.module";

export const appContainer: AppContainer = new AppContainer({
    autoBindInjectable: false,
});

export const container = appContainer.create([
    // Add your modules here
    AppModule,
]);
