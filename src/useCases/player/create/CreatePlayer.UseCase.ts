
import { Player } from "@entities/Player";
import { MailTrapProvider } from "@providers/mailTrap/MailTrap.Provider";
import { PlayerRepository } from "@repositories/player/Player.Repository";
import { provide } from "inversify-binding-decorators";
import { ICreatePlayerDTO, ICreatePlayerReturn } from "./ICreatePlayer.DTO";

@provide(CreatePlayerUseCase)
export class CreatePlayerUseCase {

    constructor(private playerRepository: PlayerRepository, private mailTrapProvider: MailTrapProvider) { }

    async execute(data: ICreatePlayerDTO): Promise<ICreatePlayerReturn> {

        const { name, email, faction } = data;
        let playerReturn: ICreatePlayerReturn;
        const sendEmail: boolean = false;

        try {
            // Verifying if the player already exist
            const playerExist: ICreatePlayerDTO = await this.playerRepository.FindByEmail(email);

            if (playerExist) {
                throw new Error('Player already exist!');
            }

            const playerObj = new Player(name, email, faction);
            await this.playerRepository.Create(playerObj);

            if (sendEmail) {
                this.mailTrapProvider.SendEmail({
                    to: {
                        name,
                        email
                    },
                    from: {
                        name: 'Clean Architecture Twitch Team',
                        email: 'clean@architecture.com'
                    },
                    subject: 'Welcome to the Clean Architecture Design!',
                    body: '<h1>Now you understand the principles of clean and Solid Architecture</h1>'
                });

            };

            playerReturn = { id: playerObj.id, email: playerObj.email, status: 'Player created successfully!' };
            return playerReturn;

        } catch (error: any) {
            return error.message;
        }
    }
}