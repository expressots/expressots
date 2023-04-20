import { provide } from "inversify-binding-decorators";
import {
  IPokebattleHistoryRequestDTO,
  IPokebattleHistoryResponseDTO,
} from "./pokebattle.dto";
import { HistoryRepository } from "@repositories/history/history.repository";

@provide(PokebattleUseCase)
class PokebattleUseCase {
  constructor(private historyRepository: HistoryRepository) {}

  async execute(
    params: IPokebattleHistoryRequestDTO,
  ): Promise<IPokebattleHistoryResponseDTO[]> {
    const response = await this.historyRepository.findAll(params.id);

    return response;
  }
}

export { PokebattleUseCase };
