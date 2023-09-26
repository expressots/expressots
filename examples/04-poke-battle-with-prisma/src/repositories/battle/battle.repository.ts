import { Battle } from "@entities/battle.entity";
import {
  PrismaClientProvider,
  prismaClient,
} from "@providers/database/orm/prisma/prisma-client.provider";
import { provide } from "inversify-binding-decorators";
import { IBattleRepository } from "./battle-repository.interface";
import { IBattleDTO } from "./battle.dto";
import { randomUUID } from "crypto";

@provide(BattleRepository)
class BattleRepository implements IBattleRepository {
  constructor(private prismaProvider: PrismaClientProvider) {}

  async findAll(id: string): Promise<IBattleDTO[]> {
    this.prismaProvider.mapToPrisma;
    const battles = await prismaClient.battle.findMany({
      where: {
        playerId: id,
      },
    });

    return battles.map((battle) => {
      const log = battle.log as {
        turn: number;
        attacker: string;
        defender: string;
        attack: string;
        attackType: string;
        damage: number;
      }[];
      return this.mapToDTO({ ...battle, log });
    });
  }

  async create(battle: IBattleDTO): Promise<Battle> {
    const createHistory = await prismaClient.battle.create({
      data: this.prismaProvider.mapToPrisma<IBattleDTO, Battle>(battle),
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

  private mapToDTO(battle: IBattleDTO): Battle {
    const newHistory = new Battle(
      battle.log,
      battle.userName,
      battle.playerId,
      battle.winner,
      battle.pokemon1,
      battle.pokemon2,
      battle.id || randomUUID(),
      battle.winnerName,
      battle.loserName,
      battle.isDraw,
    );
    return newHistory;
  }
}

export { BattleRepository };
