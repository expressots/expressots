import { CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";

export const AppModule = CreateModule([AppController]);
