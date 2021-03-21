import { MailTrapProvider } from "@/providers/email/MailTrap.Provider";
import { PlayerRepository } from "@/repositories/player/Player.Repository";
import { CreatePlayerController } from "./CreatePlayer.Controller";
import { CreatePlayerUseCase } from "./CreatePlayer.UseCase";


const playerRepository = new PlayerRepository();
const mailTrapProvider = new MailTrapProvider();

const createPlayerUseCase = new CreatePlayerUseCase(playerRepository, mailTrapProvider);
const createPlayerController = new CreatePlayerController(createPlayerUseCase);

export { createPlayerUseCase, createPlayerController };