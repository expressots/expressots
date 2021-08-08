
import { Player } from "@entities/Player";
import { IMailProvider } from "@providers/email/IMail.Provider";
import { IPlayerRepository } from "@repositories/player/IPlayer.Repository";
import { ICreateUserRequestDTO } from "./ICreatePlayer.DTO";

export class CreatePlayerUseCase {
    
    constructor(private playerRepository: IPlayerRepository, private mailProvider: IMailProvider){}
    
    async execute({name, email, faction}: ICreateUserRequestDTO){

        let playerExist: ICreateUserRequestDTO;

        try {
            playerExist = await this.playerRepository.findByEmail(email);
            
            if (playerExist) {
                throw new Error('Player already exist!');
            }
    
            const playerObj = new Player({name, email, faction});
    
            await this.playerRepository.save(playerObj);
            
            this.mailProvider.sendEmail({
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
            })

        } catch (error: any) {
            return error.message;
        }

        
    }
}