import { Player } from "@entities/Player";
import { PlayerRepository } from "@repositories/player/Player.Repository";
import { provide } from "inversify-binding-decorators";
import { IUpdatePlayerDTO, IUpdatePlayerResponseDTO } from "./IUpdatePlayerDTO";

@provide(UpdatePlayerUseCase)
export class UpdatePlayerUseCase {

    constructor(private playerRepository: PlayerRepository) { }

    async execute(id: string, updatePlayerDTO: IUpdatePlayerDTO): Promise<IUpdatePlayerResponseDTO> {

        try {
            let player = await this.playerRepository.FindOne(id) as Player;
            player.name = updatePlayerDTO.name;
            player.email = updatePlayerDTO.email;
            player.faction = updatePlayerDTO.faction;

            await this.playerRepository.Update(player);
            return { message: "Player updated successfully" };
        } catch (error: any) {
            throw new Error("Error updating player");
        }
    }
}