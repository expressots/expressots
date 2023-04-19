import { CreateModule } from "@expressots/core";
import { CreateUserController } from "./create/create-user.controller";
import { FindAllUserController } from "./findall/findall-user.controller";
import { ContainerModule } from "inversify";

const UserModule: ContainerModule = CreateModule([
    CreateUserController,
    FindAllUserController,
]);

export { UserModule };
