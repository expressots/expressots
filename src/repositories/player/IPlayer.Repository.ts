import { Player } from "@entities/Player";

export interface IPlayerRepository {
    create(player: Player): Promise<void>;
    delete(id: string): Promise<void>;
    update(player: Player): Promise<void>;
    findOne(id: string): Promise<Player>;
    findAll(): Promise<Player[]>;
    findByEmail(email: string): Promise<Player>;
}