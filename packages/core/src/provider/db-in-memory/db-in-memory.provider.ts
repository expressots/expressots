import { injectable } from "../../di/inversify";
import { IProvider } from "../provider-manager";

/*
 * Base interface that defines the structure of an entity.
 * @interface InMemoryDBEntity
 */
export interface IMemoryDBEntity {
  id: string;
}

/**
 * InMemoryDB Class
 *
 * This class and its methods offer functionalities to simulate an in-memory database.
 * It is particularly useful for developers starting with ExpressoTS without any database connection.
 *
 * @decorator @provideSingleton(InMemoryDB)
 * @public API
 */
@injectable()
export class InMemoryDB implements IProvider {
  name: string = "In Memory DB Provider";
  version: string = "3.0.0";
  author: string = "Richard Zampieri";
  repo: string = "https://github.com/expressots/expressots";

  private tables: Record<string, Array<IMemoryDBEntity>> = {};

  /**
   * getTable Method
   *
   * Retrieves a table by its name from the in-memory database.
   *
   * @param tableName - The name of the table to retrieve.
   * @returns {IEntity[]} - An array of entities.
   * @public API
   */
  public getTable(tableName: string): Array<IMemoryDBEntity> {
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    return this.tables[tableName];
  }

  /**
   * showTables Method
   *
   * Prints a list of all tables in the in-memory database to the standard output.
   * @public API
   */
  public showTables(): void {
    if (!this.tables) {
      process.stdout.write("No tables exist.");
      return;
    }

    process.stdout.write("List of tables:");
    for (const tableName in this.tables) {
      process.stdout.write(`\n- ${tableName}`);
    }
  }

  /**
   * printTable Method
   *
   * Prints all records in a specific table to the console.
   * If the table doesn't exist or is empty, it notifies the user.
   *
   * @param tableName - The name of the table to print.
   * @public API
   */
  public printTable(tableName: string): void {
    if (!this.tables) {
      process.stdout.write("No tables exist.");
      return;
    }

    const table = this.getTable(tableName);
    if (table.length === 0) {
      process.stdout.write(`Table '${tableName}' is empty.`);
      return;
    }

    process.stdout.write(`\nRecords in table '${tableName}':\n`);
    console.table(table);
  }
}
