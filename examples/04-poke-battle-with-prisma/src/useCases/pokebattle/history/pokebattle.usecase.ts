import { provide } from "inversify-binding-decorators";
import {
  IPokebattleHistoryRequestDTO,
  IPokebattleHistoryResponseDTO,
} from "./pokebattle.dto";
import { BattleRepository } from "@repositories/battle/battle.repository";

@provide(PokebattleUseCase)
class PokebattleUseCase {
  constructor(private historyRepository: BattleRepository) {}

  async execute(
    params: IPokebattleHistoryRequestDTO,
  ): Promise<IPokebattleHistoryResponseDTO[]> {
    const response = await this.historyRepository.findAll(params.id);

    return response;
  }
}

export { PokebattleUseCase };
