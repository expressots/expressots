import { inject } from "inversify";
import { provide } from "inversify-binding-decorators";
import { IBaseRepository } from "./base-repository.interface";
import { IEntity } from "@entities/base.entity";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


prisma.$connect()
prisma.$disconnect()

@provide(BaseRepository)
class BaseRepository<T extends IEntity> implements IBaseRepository<T> {
  create(item: T): Promise<T> {
    return prisma.user.create({
      data: item,
    });
  }

  delete(id: string): Promise<boolean> {
    return prisma.user.delete({
      where: {
        id,
      },
    });
  }

  update(item: T): Promise<T | null> {
    return prisma.user.update({
      where: {
        id: item.id,
      },
      data: item,
    });
  }

  find(id: string): Promise<T | null> {
    return prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  findAll(): Promise<T[]> {
    return prisma.user.findMany();
  }
}

export { BaseRepository };
