import { ContainerModule, CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";

export const AppModule: ContainerModule = CreateModule([AppController]);
