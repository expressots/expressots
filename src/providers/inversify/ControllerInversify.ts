import { FindAllPlayersController } from './../../useCases/player/findAll/FindAllPlayersController';
import { CreatePlayerController } from "@useCases/player/create/CreatePlayer.Controller";
import { ContainerModule, interfaces } from "inversify";
import { RouterController } from "Router";
import { FindPlayerController } from '@useCases/player/findOne/FindPlayerController';
import { DeletePlayerController } from '@useCases/player/delete/DeletePlayerController';
import { UpdatePlayerController } from '@useCases/player/update/UpdatePlayerController';

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