import { Player } from "@entities/Player";
import { provide } from "inversify-binding-decorators";
import { IPlayerRepository } from "./IPlayer.Repository";

@provide(PlayerRepository)
export class PlayerRepository implements IPlayerRepository {

    private players: Player[] = [];

    async create(player: Player): Promise<void> {
        this.players.push(player);
    }
    
    async delete(id: string): Promise<void> {
        this.players.splice(this.players.findIndex(player => player.id === id), 1);
    }
   
    async update(player: Player): Promise<void> {
        
    }

    async findOne(id: string): Promise<Player> {
        throw new Error("Method not implemented.");
    }

    async findAll(): Promise<Player[]> {
        throw new Error("Method not implemented.");
    }
    
    async findByEmail(email: string): Promise<Player> {
        const player = this.players.find(player => player.email === email) as Player;
        return player;
    }
}

    
    