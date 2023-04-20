import { CreateModule } from "@expressots/core";
import { CreateUserController } from "./create/create-user.controller";
import { FindAllUserController } from "./findall/findall-user.controller";
import { LoginUserController } from "./login/login-user.controller";
import { GetUserController } from "./getUser/getuser-user.controller";

const UserModule = CreateModule([
  CreateUserController,
  FindAllUserController,
  LoginUserController,
  GetUserController,
]);

export { UserModule };
