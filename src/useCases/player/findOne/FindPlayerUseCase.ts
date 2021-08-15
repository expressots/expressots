import { PlayerRepository } from "@repositories/player/Player.Repository";
import { provide } from "inversify-binding-decorators";
import { IFindPlayerDTO } from "./IFindPlayerDTO";

@provide(FindPlayerUseCase)
export class FindPlayerUseCase {
    
    constructor(private playerRepository: PlayerRepository) {}

    async execute(id: string): Promise<IFindPlayerDTO> {
        
        return await this.playerRepository.findOne(id) as IFindPlayerDTO;
    }
}