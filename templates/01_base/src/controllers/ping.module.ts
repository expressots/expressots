import { CreateModule } from "@expressots/core";
import { PingController } from "./ping/ping.controller";

const PingModule = CreateModule([
    PingController
])

export { PingModule };