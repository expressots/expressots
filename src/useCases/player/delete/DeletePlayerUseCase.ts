import { PlayerRepository } from "@repositories/player/Player.Repository";
import { provide } from "inversify-binding-decorators";
import { IDeletePlayerDTO } from "./IDeletePlayerDTO";

@provide(DeletePlayerUseCase)
export class DeletePlayerUseCase {
    
    constructor(private playerRepository: PlayerRepository) {}

    async execute(id: string): Promise<IDeletePlayerDTO> {
        
        try {
            const player = await this.playerRepository.findOne(id);
            if (player) {
                await this.playerRepository.delete(id);
                const message: IDeletePlayerDTO = { message: "Player deleted successfully" };
                return message;    
            };
            return { message: "Player not found" };
        } catch (error: any) {
            throw new Error(error);
        }   
    }
}