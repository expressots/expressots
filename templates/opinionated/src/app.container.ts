import { Container } from "inversify";
import { AppContainer } from "@expressots/core";
import { AppModule } from "@useCases/app/app.module";

export const appContainer: AppContainer = new AppContainer({
    autoBindInjectable: false,
});

export const container: Container = appContainer.create([
    // Add your modules here
    AppModule,
]);
