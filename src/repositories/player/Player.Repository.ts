import { Player } from "@entities/Player";
import { BaseRepository } from "@repositories/Base.Repository";
import { provide } from "inversify-binding-decorators";
import { IPlayerRepository } from "./IPlayer.Repository";

@provide(PlayerRepository)
class PlayerRepository extends BaseRepository<Player> implements IPlayerRepository {

    static players: Player[] = [];

    async FindByEmail(email: string): Promise<Player> {
        const player = PlayerRepository.players.find(player => player.email === email) as Player;
        return player;
    }
}

export { PlayerRepository };
