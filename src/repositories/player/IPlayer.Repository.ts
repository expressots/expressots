import { Player } from "../../entities/Player";

export interface IPlayerRepository {
    save(player: Player): Promise<void>;
    findByEmail(email: string): Promise<Player>;
}