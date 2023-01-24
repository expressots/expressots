import { ContainerModule, interfaces } from "inversify";
import { RouterController } from "Router";
import { CreateJwtController } from "@useCases/jwt/create/CreateJwt.Controller";
import { CreateUserController } from "@useCases/user/create/CreateUser.Controller";
import { JsonWebTokenProvider } from "@providers/jwt/JsonWebToken.Provider";
import { FetchLoggedUserMiddleware } from "@providers/middlewares/FetchLoggedUser.middleware";
import { TYPES } from '@providers/types/types.core';
import { DeleteUserController } from "@useCases/user/delete/DeleteUser.Controller";
import { FindByIdController } from "@useCases/user/findById/FindById.Controller";
import { UpdateUserController } from "@useCases/user/update/UpdateUser.Controller";
import { FindAllUsersController } from "@useCases/user/findAll/FindAllUsers.Controller";

export const serverContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<RouterController>(TYPES.RouterController).to(RouterController);
});

export const jwtContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<JsonWebTokenProvider>(TYPES.JsonWebTokenProvider).to(JsonWebTokenProvider);
    bind<FetchLoggedUserMiddleware>(TYPES.FetchLoggedUserMiddleware).to(FetchLoggedUserMiddleware);
    bind<CreateJwtController>(TYPES.CreateJwtController).to(CreateJwtController);
});

export const userContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<CreateUserController>(TYPES.CreateUserController).to(CreateUserController);
    bind<DeleteUserController>(TYPES.DeleteUserController).to(DeleteUserController);
    bind<FindByIdController>(TYPES.FindByIdController).to(FindByIdController);
    bind<UpdateUserController>(TYPES.UpdateUserController).to(UpdateUserController);
    bind<FindAllUsersController>(TYPES.FindALlUsersController).to(FindAllUsersController);
});
