import { IProvider } from "../provider-manager";

/*
 * Base interface that defines the structure of an entity.
 * This interface is used by the InMemoryDB class to ensure that all entities have an 'id' property.
 */
export interface IEntity {
  id: string;
}

/**
 * IRepository Interface
 * Generic interface that defines the structure of a repository.
 * @template T - The type of entity to be stored in the repository.
 * @public API
 */
export interface IRepository<T extends IEntity> {
  create(item: T): Promise<T>;
  update(item: T): Promise<T>;
  delete(id: string): Promise<boolean>;
  find(id: string): Promise<T>;
  findAll(): Promise<Array<T>>;
  query(predicate: (item: T) => boolean): Promise<Array<T>>;
  transaction(actions: () => Promise<void>): Promise<void>;
}

/**
 * IDataTable Interface for CRUD operations
 * Generic interface that defines the structure of a data table.
 * @template T - The type of entity to be stored in the data table.
 * @public API
 */
export interface IDataTable<T extends IEntity> {
  insert(item: T): Promise<T>;
  insertMany(items: Array<T>): Promise<Array<T>>;
  update(item: T): Promise<T>;
  delete(id: string): Promise<boolean>;
  find(id: string): Promise<T>;
  findAll(): Promise<Array<T>>;
  query(predicate: (item: T) => boolean): Promise<Array<T>>;
  transaction(actions: () => Promise<void>): Promise<void>;
}

/**
 * IDataProvider Interface for obtaining data tables
 * Generic interface that defines the structure of a data provider.
 * @public API
 */
export interface IDataProvider extends IProvider {
  getTable<T extends IEntity>(tableName: string): IDataTable<T>;
}
