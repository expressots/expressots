import { CreateModule } from "@expressots/core";
import { PingController } from "./ping.controller";

const PingModule = CreateModule([
    // Add your modules here
    PingController,
]);

export { PingModule };
