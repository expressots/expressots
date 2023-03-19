import { CreateModule } from "@expressots/core";
import { PingController } from "./ping.controller";
import { ContainerModule } from "inversify";

const PingModule: ContainerModule = CreateModule([
    // Add your modules here
    PingController,
]);

export { PingModule };
