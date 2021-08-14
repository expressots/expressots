import { CreatePlayerController } from "@useCases/player/create/CreatePlayer.Controller";
import { ContainerModule, interfaces } from "inversify";
import { RouterController } from "Router";

export const serverControllerContainer = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<RouterController>("RouterController").to(RouterController);
});

export const playerControllerContainer = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<CreatePlayerController>("CreatePlayerController").to(CreatePlayerController);
});