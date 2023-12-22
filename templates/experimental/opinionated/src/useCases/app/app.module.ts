import { CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";

const AppModule = CreateModule([AppController]);

export { AppModule };
