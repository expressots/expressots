import { IEntity } from "@entities/base.entity";
import { TypeORMProvider } from "@providers/orm/typeorm/typeorm.provider";
import { provide } from "inversify-binding-decorators";
import { IBaseRepository } from "./base-repository.interface";
import { ObjectType, Repository } from "typeorm";

@provide(BaseRepository)
class BaseRepository<T extends IEntity> implements IBaseRepository<T> {
    protected entityClass!: ObjectType<T>;

    protected getRepository(): Repository<T> {
        return TypeORMProvider.dataSource.getRepository(this.entityClass);
    }

    create(item: T): T | null {
        const repository = this.getRepository();
        repository.save(item);

        return item;
    }

    update(item: T): T | null {
        const repository = this.getRepository();
        repository.save(item);

        return item;
    }

    async delete(id: number | string): Promise<boolean> {
        const repository = await this.getRepository();
        const res = await repository.delete(id);

        return (
            res.affected !== null &&
            res.affected !== undefined &&
            res.affected > 0
        );
    }

    async find(id: number): Promise<T | null> {
        const repository = this.getRepository();
        const tableName = repository.metadata.tableName;
        const result = await repository
            .createQueryBuilder(tableName)
            .where(`${tableName}.id = :id`, { id })
            .getOne();

        return result;
    }

    async findAll(): Promise<T[]> {
        const repository = this.getRepository();
        const res = await repository.find();
        return res;
    }
}

export { BaseRepository };
