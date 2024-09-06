import { provide } from "inversify-binding-decorators";
import { IMemoryDBEntity, InMemoryDB } from "./db-in-memory.provider";
import { inject } from "../../di/inversify";

/*
 * Base Repository
 * @interface IBaseRepository
 * @template T - The type of entity to be stored in the repository.
 * @template IMemoryDBEntity - The structure of the entity.
 */
export interface IBaseRepository<T extends IMemoryDBEntity> {
  create(item: T): T | null;
  update(item: T): T | null;
  delete(id: string): boolean;
  find(id: string): T | null;
  findAll(): Array<T> | null;
}

/**
 * Base Repository Class
 *
 * This class provides the basic functionalities to interact with an in-memory database.
 *
 * @decorator @provide(BaseRepository)
 */
@provide(BaseRepository)
export class BaseRepository<T extends IMemoryDBEntity>
  implements IBaseRepository<T>
{
  @inject(InMemoryDB)
  private inMemoryDB!: InMemoryDB;
  private tableName: string;

  /**
   * Constructor
   * @param tableName - The name of the table to interact with.
   *
   */
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Getter for the table
   * @returns {T[]} - An array of entities.
   */
  protected get table(): Array<T> {
    return [...this.inMemoryDB.getTable(this.tableName)] as Array<T>;
  }

  /**
   * create Method
   * @param item - The entity to be created.
   * @returns {T | null} - The created entity or null if the entity already exists.
   * @throws {Error} - If the entity already exists.
   */
  create(item: T): T | null {
    const existingItem = this.table.find((i) => i.id === item.id);
    if (existingItem) {
      throw new Error(`Object with id ${item.id} already exists`);
    }

    this.inMemoryDB.getTable(this.tableName).push(item);

    this.inMemoryDB.printTable(this.tableName);
    return item;
  }

  /**
   * delete Method
   * @param id - The id of the entity to be deleted.
   * @returns {boolean} - True if the entity was deleted, false otherwise.
   * @throws {Error} - If the entity does not exist.
   */
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

  /**
   * update Method
   * @param item - The entity to be updated.
   * @returns {T | null} - The updated entity or null if the entity does not exist
   * @throws {Error} - If the entity does not exist.
   */
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

  /**
   * find Method
   * @param id - The id of the entity to find.
   * @returns {T | null} - The entity if it exists, null otherwise
   * @throws {Error} - If the entity does not exist.
   */
  find(id: string): T | null {
    const item = this.table.find((item) => item.id === id);

    this.inMemoryDB.printTable(this.tableName);

    return item || null;
  }

  /**
   * findAll Method
   * @returns {T[] | null} - An array of entities or null if the table is empty.
   */
  findAll(): Array<T> | null {
    this.inMemoryDB.printTable(this.tableName);

    return this.table;
  }
}
