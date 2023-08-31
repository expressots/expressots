import { AppContainer } from "@expressots/core";
import { AppModule } from "./app.module";
import { BindingScopeEnum } from "inversify";

const appContainer = new AppContainer();

const container = appContainer.create([
    // Add your modules here
    AppModule,
], BindingScopeEnum.Singleton);

export { container };
