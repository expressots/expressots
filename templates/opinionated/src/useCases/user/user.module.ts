import { CreateModule } from "@expressots/core";
import { CreateUserController } from "./create/create-user.controller";
import { FindAllUserController } from "./findall/findall-user.controller";

const UserModule = CreateModule([CreateUserController, FindAllUserController]);

export { UserModule };
