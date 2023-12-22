import { inject } from "inversify";
import { provide } from "inversify-binding-decorators";
import { IBaseRepository } from "./base-repository.interface";
import { IEntity } from "@entities/base.entity";
import { InMemoryDB } from "@providers/db-in-memory/db-in-memory.provider";

@provide(BaseRepository)
class BaseRepository<T extends IEntity> implements IBaseRepository<T> {
    @inject(InMemoryDB) private inMemoryDB!: InMemoryDB;

    protected get USERDB(): T[] {
        return [...this.inMemoryDB.getUserDB()] as T[];
    }

    create(item: T): T | null {
        const existingItem = this.USERDB.find((user) => user.id === item.id);
        if (existingItem) {
            throw new Error(`Object with id ${item.id} already exists`);
        }

        this.inMemoryDB.getUserDB().push(item);
        return item;
    }

    delete(id: string): boolean {
        const db = this.inMemoryDB.getUserDB();
        const index: number = db.findIndex((item) => item.id === id);

        if (index !== -1) {
            db.splice(index, 1);
            return true;
        }
        return false;
    }

    update(item: T): T | null {
        const db = this.inMemoryDB.getUserDB();
        const index: number = db.findIndex((i) => i.id === item.id);

        if (index !== -1) {
            db[index] = item;
            return item;
        }
        return null;
    }

    find(id: string): T | null {
        const user = this.USERDB.find((item) => item.id === id);
        return user || null;
    }

    findAll(): T[] {
        return this.USERDB;
    }
}

export { BaseRepository };
