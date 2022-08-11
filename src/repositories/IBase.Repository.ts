import { IBaseEntity } from "@entities/IBase.Entity";

interface IBaseRepository<T extends IBaseEntity> {
    Create(item: T): Promise<T>;
    Update(item: T): Promise<T>;
    Delete(id: string): Promise<T>;
    FindOne(id: string): Promise<T | undefined>;
    FindAll(): Promise<T[]>;
}

export { IBaseRepository };