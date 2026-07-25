import { IBattleDTO } from "./battle.dto";

interface IBattleRepository {
  findAll(id: string): Promise<IBattleDTO[]>;
  create(user: IBattleDTO): Promise<IBattleDTO>;
}

export { IBattleRepository };
