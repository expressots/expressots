import { ContainerModule, interfaces } from "inversify";
import { CreateUserController } from "@useCases/user/create/CreateUser.Controller";
import { JwtProvider } from "@providers/jwt/Jwt.Provider";
import { TYPES } from '@providers/core/types/Types.Symbol.core';
import { DeleteUserController } from "@useCases/user/delete/DeleteUser.Controller";
import { FindByIdController } from "@useCases/user/findById/FindById.Controller";
import { UpdateUserController } from "@useCases/user/update/UpdateUser.Controller";
import { FindAllUsersController } from "@useCases/user/findAll/FindAllUsers.Controller";

export const jwtContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<JwtProvider>(TYPES.JwtProvider).to(JwtProvider);
});

export const userContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<CreateUserController>(TYPES.CreateUserController).to(CreateUserController);
    bind<DeleteUserController>(TYPES.DeleteUserController).to(DeleteUserController);
    bind<FindByIdController>(TYPES.FindByIdController).to(FindByIdController);
    bind<UpdateUserController>(TYPES.UpdateUserController).to(UpdateUserController);
    bind<FindAllUsersController>(TYPES.FindALlUsersController).to(FindAllUsersController);
});
