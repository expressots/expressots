import { inject } from "inversify";
import { provide } from "inversify-binding-decorators";
import { IBaseRepository } from "./base-repository.interface";
import { IEntity } from "@entities/base.entity";
import { InMemoryDB } from "@providers/db-in-memory/db-in-memory.provider";

@provide(BaseRepository)
export class BaseRepository<T extends IEntity> implements IBaseRepository<T> {
    @inject(InMemoryDB)
    private inMemoryDB!: InMemoryDB;
    private tableName: string;

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    protected get table(): T[] {
        return [...this.inMemoryDB.getTable(this.tableName)] as T[];
    }

    create(item: T): T | null {
        const existingItem = this.table.find((i) => i.id === item.id);
        if (existingItem) {
            throw new Error(`Object with id ${item.id} already exists`);
        }

        this.inMemoryDB.getTable(this.tableName).push(item);

        this.inMemoryDB.printTable(this.tableName);
        return item;
    }

    delete(id: string): boolean {
        const db = this.inMemoryDB.getTable(this.tableName);
        const index: number = db.findIndex((item) => item.id === id);

        if (index !== -1) {
            db.splice(index, 1);

            this.inMemoryDB.printTable(this.tableName);

            return true;
        }
        return false;
    }

    update(item: T): T | null {
        const db = this.inMemoryDB.getTable(this.tableName);
        const index: number = db.findIndex((i) => i.id === item.id);

        if (index !== -1) {
            db[index] = item;

            this.inMemoryDB.printTable(this.tableName);

            return item;
        }
        return null;
    }

    find(id: string): T | null {
        const item = this.table.find((item) => item.id === id);

        this.inMemoryDB.printTable(this.tableName);

        return item || null;
    }

    findAll(): T[] {
        this.inMemoryDB.printTable(this.tableName);

        return this.table;
    }
}
