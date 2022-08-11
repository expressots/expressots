import { Player } from "@entities/Player";
import { IBaseRepository } from "@repositories/IBase.Repository";

interface IPlayerRepository extends IBaseRepository<Player> {
    FindByEmail(email: string): Promise<Player>;
}

export { IPlayerRepository };