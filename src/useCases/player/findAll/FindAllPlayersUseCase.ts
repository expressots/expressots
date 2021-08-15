import { PlayerRepository } from "@repositories/player/Player.Repository";
import { provide } from "inversify-binding-decorators";
import { IFindAllPlayersDTO } from "./IFindAllPlayersDTO";

@provide(FindAllPlayersUseCase)
export class FindAllPlayersUseCase {
    
    constructor(private playerRepository:PlayerRepository) { }

    async execute(): Promise<IFindAllPlayersDTO[]> {
        // get all names of players
        const players = await this.playerRepository.findAll();
        
        // convert to DTO
        const playersToReturn:IFindAllPlayersDTO[] = players.map(player => {
            return { 
                id: player.id,
                name: player.name
            }
        });

        return playersToReturn;
    }
}