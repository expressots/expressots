import { CreateModule } from "@expressots/core";
import { CreateUserController } from "./create/create-user.controller";

const UserModule = CreateModule([CreateUserController]);

export { UserModule };
