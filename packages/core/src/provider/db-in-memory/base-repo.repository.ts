import { inject, injectable, unmanaged } from "../../di/inversify";
import {
  IDataProvider,
  IDataTable,
  IEntity,
  IRepository,
} from "./db-in-memory.interface";

/**
 * Base repository class using the repository pattern.
 * @template T - The type of entity to be stored in the repository.
 * @public API
 */
@injectable()
export class BaseRepository<T extends IEntity> implements IRepository<T> {
  protected dataTable: IDataTable<T>;
  protected entityName: string;

  constructor(
    @inject("IDataProvider") dataProvider: IDataProvider,
    @unmanaged() tableName: string,
  ) {
    this.dataTable = dataProvider.getTable<T>(tableName);
    this.entityName = tableName;
  }

  async create(item: T): Promise<T> {
    return this.dataTable.insert(item);
  }

  async update(item: T): Promise<T> {
    return this.dataTable.update(item);
  }

  async delete(id: string): Promise<boolean> {
    return this.dataTable.delete(id);
  }

  async find(id: string): Promise<T> {
    return this.dataTable.find(id);
  }

  async findAll(): Promise<Array<T>> {
    return this.dataTable.findAll();
  }

  async query(predicate: (item: T) => boolean): Promise<Array<T>> {
    return this.dataTable.query(predicate);
  }

  async transaction(actions: () => Promise<void>): Promise<void> {
    await this.dataTable.transaction(actions);
  }
}
