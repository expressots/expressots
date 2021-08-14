import { Player } from "@entities/Player";
import { provide } from "inversify-binding-decorators";
import { IPlayerRepository } from "./IPlayer.Repository";

@provide(PlayerRepository)
export class PlayerRepository implements IPlayerRepository {
    
    private players: Player[] = [];

    async save(player: Player): Promise<void> {
        this.players.push(player);
    }
    
    async findByEmail(email: string): Promise<Player> {
        const player = this.players.find(player => player.email === email) as Player;
        return player;
    }

    async getPlayers(): Promise<Player[]> {
        return this.players;
    }
   
}

    
    