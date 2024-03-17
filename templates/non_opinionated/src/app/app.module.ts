import { ContainerModule } from "inversify";
import { CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";

export const AppModule: ContainerModule = CreateModule([AppController]);
