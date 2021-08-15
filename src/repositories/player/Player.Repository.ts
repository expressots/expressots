import { Player } from "@entities/Player";
import { provide } from "inversify-binding-decorators";
import { IPlayerRepository } from "./IPlayer.Repository";

@provide(PlayerRepository)
export class PlayerRepository implements IPlayerRepository {

    static players: Player[] = [];

    async create(player: Player): Promise<void> {
        PlayerRepository.players.push(player);
    }
    
    async delete(id: string): Promise<void> {
        PlayerRepository.players.splice(PlayerRepository.players.findIndex(player => player.id === id), 1);
    }
   
    async update(player: Player): Promise<void> {
        const pIndex: number = PlayerRepository.players.findIndex(p => p.id === player.id);
        if (pIndex > -1) {
            PlayerRepository.players[pIndex] = player;
        };
    }

    async findOne(id: string): Promise<Player> {
        const player = PlayerRepository.players.find(player => player.id === id) as Player;
        return player;
    }

    async findAll(): Promise<Player[]> {
        return PlayerRepository.players;
    }
    
    async findByEmail(email: string): Promise<Player> {
        const player = PlayerRepository.players.find(player => player.email === email) as Player;
        return player;
    }
}

    
    