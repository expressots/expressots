import { FindAllPlayersController } from './../../useCases/player/findAll/FindAllPlayersController';
import { CreatePlayerController } from "@useCases/player/create/CreatePlayer.Controller";
import { ContainerModule, interfaces } from "inversify";
import { RouterController } from "router";
import { FindPlayerController } from '@useCases/player/findOne/FindPlayerController';
import { DeletePlayerController } from '@useCases/player/delete/DeletePlayerController';
import { UpdatePlayerController } from '@useCases/player/update/UpdatePlayerController';
import { JsonWebTokenService } from 'services/jsonWebTokens.service';
import { FetchLoggedUserMiddleware } from 'middlewares/fetchLoggedUser.middleware';
import { CreateJwtController } from '@useCases/jwt/create/CreateJwt.Controller';
import { CreateUserController } from '@useCases/user/create/CreateUser.Controller';

export const serverControllerContainer = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<RouterController>("RouterController").to(RouterController);
});

export const playerControllerContainer = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<CreatePlayerController>("CreatePlayerController").to(CreatePlayerController);
    bind<FindAllPlayersController>("FindAllPlayersController").to(FindAllPlayersController);
    bind<FindPlayerController>("FindPlayerController").to(FindPlayerController);
    bind<DeletePlayerController>("DeletePlayerController").to(DeletePlayerController);
    bind<UpdatePlayerController>("UpdatePlayerController").to(UpdatePlayerController);
});

export const jwtControllerContainer = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<JsonWebTokenService>("JsonWebTokenService").to(JsonWebTokenService);
    bind<FetchLoggedUserMiddleware>("FetchLoggedUserMiddleware").to(FetchLoggedUserMiddleware);
    bind<CreateJwtController>("CreateJwtController").to(CreateJwtController);
    bind<CreateUserController>("CreateUserController").to(CreateUserController);
});