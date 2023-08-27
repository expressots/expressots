import { PrismaClient, Prisma } from "@prisma/client";
import {
    CreateInput,
    ModelsOf,
    DeleteWhere,
    Select,
    PrismaAction,
} from "@expressots/prisma";
import { IBaseRepository } from "./base-repository.interface";
import { injectable } from "inversify";

@injectable()
class BaseRepository<ModelName extends ModelsOf<PrismaClient>>
    implements IBaseRepository<ModelName>
{
    protected prismaModel: any;
    protected prismaClient: PrismaClient;
    constructor(modelName: keyof PrismaClient) {
        this.prismaClient = new PrismaClient();
        this.prismaModel = this.prismaClient[modelName];
    }

    async aggregate(args: PrismaAction<ModelName, "aggregate">): Promise<any> {
        return await this.prismaModel.aggregate(args);
    }

    async count(args: PrismaAction<ModelName, "count">): Promise<number> {
        return await this.prismaModel.count(args);
    }

    async create(
        data:
            | CreateInput<ModelName>["data"]
            | {
                  data: CreateInput<ModelName>["data"];
                  select?: Select<ModelName, "create">["select"];
              },
    ): Promise<ModelName | never> {
        if (!data) {
            throw new Error("Data cannot be null or undefined");
        }

        if (typeof data === "object" && "data" in data) {
            return await this.prismaModel.create(data);
        }

        return await this.prismaModel.create({ data });
    }

    async delete(
        where: DeleteWhere<ModelName>["where"],
        select?: Select<ModelName, "delete">["select"],
    ): Promise<ModelName | never> {
        if (!where) {
            throw new Error("Data cannot be null or undefined");
        }

        const obj = await this.prismaModel.delete({ where });

        if (select) {
            const entries = Object.entries(select);

            const hasTrueField = entries.some(([, value]) => value);

            if (hasTrueField) {
                const result: any = {};
                for (const [key, value] of entries) {
                    if (value) {
                        result[key] = obj[key as keyof typeof obj];
                    }
                }
                return result as ModelName;
            } else {
                for (const [key, value] of entries) {
                    if (!value) {
                        delete obj[key as keyof typeof obj];
                    }
                }
            }
        }

        return obj;
    }

    async deleteMany(
        args?: PrismaAction<ModelName, "deleteMany">,
    ): Promise<Prisma.BatchPayload> {
        return await this.prismaModel.deleteMany(args);
    }

    async findFirst(
        args?: PrismaAction<ModelName, "findFirst">,
    ): Promise<ModelName | null> {
        return await this.prismaModel.findFirst(args);
    }

    async findFirstOrThrow(
        args?: PrismaAction<ModelName, "findFirstOrThrow">,
    ): Promise<ModelName | never> {
        return await this.prismaModel.findFirstOrThrow(args);
    }

    async findMany(
        args: PrismaAction<ModelName, "findMany">,
    ): Promise<ModelName[]> {
        return await this.prismaModel.findMany(args);
    }

    async findUnique(
        args: PrismaAction<ModelName, "findUnique">,
    ): Promise<ModelName | null> {
        return this.prismaModel.findUnique(args);
    }

    async findUniqueOrThrow(
        args?: PrismaAction<ModelName, "findUniqueOrThrow">,
    ): Promise<ModelName | never> {
        return await this.prismaModel.findUniqueOrThrow(args);
    }

    async groupBy(
        args: PrismaAction<ModelName, "groupBy">,
    ): Promise<ModelName | never> {
        return await this.prismaModel.groupBy(args);
    }

    async update(
        args: PrismaAction<ModelName, "update">,
    ): Promise<ModelName | never> {
        return await this.prismaModel.update(args);
    }

    async updateMany(
        args: PrismaAction<ModelName, "updateMany">,
    ): Promise<Prisma.BatchPayload> {
        return await this.prismaModel.updateMany(args);
    }

    async upsert(
        args: PrismaAction<ModelName, "upsert">,
    ): Promise<ModelName | never> {
        return await this.prismaModel.upsert(args);
    }
}

export { BaseRepository };
