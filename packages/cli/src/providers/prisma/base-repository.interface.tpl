import { Prisma } from "@prisma/client";
import { CreateInput, ModelsOf, DeleteWhere, Select, PrismaAction } from "@expressots/prisma";

interface IBaseRepository<ModelName extends ModelsOf<PrismaClient>> { 
    aggregate: (args: PrismaAction<ModelName, "aggregate">) => Promise<any>; 
    count: (args: PrismaAction<ModelName, "count">) => Promise<number>;
    create: (data: CreateInput<ModelName> | { data : CreateInput<ModelName>, select?: Select<ModelName, "create">}) => Promise<ModelName | never>; 
    delete: (where: DeleteWhere<ModelName>, response?: Select<ModelName, "delete">) => Promise<ModelName | never>;   
    deleteMany: (args?: PrismaAction<ModelName, "deleteMany">) => Promise<Prisma.BatchPayload>;
    findFirst: (args: PrismaAction<ModelName, "findFirst">) => Promise<ModelName | null>;
    findFirstOrThrow: (args?: PrismaAction<ModelName, "findFirstOrThrow">) => Promise<ModelName | never>;
    findMany: (args: PrismaAction<ModelName, "findMany">) => Promise<ModelName[]>;
    findUnique: (args: PrismaAction<ModelName, "findUnique">) => Promise<ModelName | null>;
    findUniqueOrThrow: (args?: PrismaAction<ModelName, "findFirstOrThrow">) => Promise<ModelName | never>;
    groupBy: (args: PrismaAction<ModelName, "groupBy">) => Promise<ModelName | never>;
    update: (args: PrismaAction<ModelName, "update">) => Promise<ModelName | never>;
    updateMany: (args: PrismaAction<ModelName, "updateMany">) => Promise<Prisma.BatchPayload>;
    upsert: (args: PrismaAction<ModelName, "upsert">) => Promise<ModelName | never>;
  }

export { IBaseRepository };