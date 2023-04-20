import { History } from "@entities/history.entity";
import { PrismaClientProvider } from "@providers/database/orm/prisma/prisma-client.provider";
import { provide } from "inversify-binding-decorators";
import { IHistoryRepository } from "./history-repository.interface";
import { IHistoryDTO } from "./history.dto";
import { randomUUID } from "crypto";

@provide(HistoryRepository)
class HistoryRepository implements IHistoryRepository {
  constructor(private prismaClient: PrismaClientProvider) {}

  async findAll(id: string): Promise<IHistoryDTO[]> {
    const historys = await this.prismaClient.client.history.findMany({
      where: {
        playerId: id,
      },
    });

    return historys.map((history) => {
      const log = history.log as {
        turn: number;
        attacker: string;
        defender: string;
        attack: string;
        attackType: string;
        damage: number;
      }[];
      return this.mapToDTO({ ...history, log });
    });
  }

  async create(history: IHistoryDTO): Promise<History> {
    const createHistory = await this.prismaClient.client.history.create({
      data: this.prismaClient.mapToPrisma<IHistoryDTO, History>(history),
    });

    const log = createHistory.log as {
      turn: number;
      attacker: string;
      defender: string;
      attack: string;
      attackType: string;
      damage: number;
    }[];

    return this.mapToDTO({ ...createHistory, log });
  }

  private mapToDTO(history: IHistoryDTO): History {
    const newHistory = new History(
      history.log,
      history.userName,
      history.playerId,
      history.winner,
      history.pokemon1,
      history.pokemon2,
      history.id || randomUUID(),
      history.winnerName,
      history.loserName,
      history.isDraw,
    );
    return newHistory;
  }
}

export { HistoryRepository };
