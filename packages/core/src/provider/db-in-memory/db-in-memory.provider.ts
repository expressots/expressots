import { injectable } from "../../di/inversify";
import { IDataProvider, IEntity, IDataTable } from "./db-in-memory.interface";
import {
  EntityAlreadyExistsError,
  EntityNotFoundError,
} from "./db-in-memory.types";

/**
 * In-memory data provider implementation.
 * @public API
 */
@injectable()
export class InMemoryDataProvider implements IDataProvider {
  name: string = "In Memory DB Provider";
  version: string = "3.0.0";
  author: string = "Richard Zampieri";
  repo: string = "https://github.com/expressots/expressots";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tables = new Map<string, InMemoryDataTable<any>>();

  getTable<T extends IEntity>(tableName: string): IDataTable<T> {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new InMemoryDataTable<T>(tableName));
    }
    return this.tables.get(tableName) as IDataTable<T>;
  }
}

/**
 * In-memory data table implementation.
 */
export class InMemoryDataTable<T extends IEntity> implements IDataTable<T> {
  private items = new Map<string, T>();
  private tableName: string;
  private transactionStack: Array<Map<string, T>> = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async insert(item: T): Promise<T> {
    if (this.items.has(item.id)) {
      throw new EntityAlreadyExistsError(this.tableName, item.id);
    }
    this.items.set(item.id, item);
    return item;
  }

  async insertMany(items: Array<T>): Promise<Array<T>> {
    const insertedItems: Array<T> = [];
    for (const item of items) {
      const insertedItem = await this.insert(item);
      insertedItems.push(insertedItem);
    }
    return insertedItems;
  }

  async update(item: T): Promise<T> {
    if (!this.items.has(item.id)) {
      throw new EntityNotFoundError(this.tableName, item.id);
    }
    this.items.set(item.id, item);
    return item;
  }

  async delete(id: string): Promise<boolean> {
    if (!this.items.has(id)) {
      throw new EntityNotFoundError(this.tableName, id);
    }
    return this.items.delete(id);
  }

  async find(id: string): Promise<T> {
    const item = this.items.get(id);
    if (!item) {
      throw new EntityNotFoundError(this.tableName, id);
    }
    return item;
  }

  async findAll(): Promise<Array<T>> {
    return Array.from(this.items.values());
  }

  async query(predicate: (item: T) => boolean): Promise<Array<T>> {
    return Array.from(this.items.values()).filter(predicate);
  }

  async transaction(actions: () => Promise<void>): Promise<void> {
    this.beginTransaction();
    try {
      await actions();
      this.commitTransaction();
    } catch (error) {
      this.rollbackTransaction();
      throw error;
    }
  }

  private beginTransaction(): void {
    const snapshot = new Map(this.items);
    this.transactionStack.push(snapshot);
  }

  private commitTransaction(): void {
    this.transactionStack.pop();
  }

  private rollbackTransaction(): void {
    const snapshot = this.transactionStack.pop();
    if (snapshot) {
      this.items = snapshot;
    } else {
      throw new Error("No transaction to rollback.");
    }
  }
}
