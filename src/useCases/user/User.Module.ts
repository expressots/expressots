import { CreateUserController } from "./create/CreateUser.Controller";
import { DeleteUserController } from "./delete/DeleteUser.Controller";
import { FindByIdController } from "./findById/FindById.Controller";
import { UpdateUserController } from "./update/UpdateUser.Controller";
import { FindAllUsersController } from "./findAll/FindAllUsers.Controller";

import { CreateModule } from "@providers/core/containerModule/BaseModule.Provider";

export const UserContainerModule = CreateModule([
    CreateUserController,
    DeleteUserController,
    FindByIdController,
    UpdateUserController,
    FindAllUsersController
]);
