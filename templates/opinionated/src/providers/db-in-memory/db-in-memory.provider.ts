import { provideSingleton } from "@expressots/core";
import { IEntity } from "@entities/base.entity";

/**
 * InMemoryDB Class
 *
 * This class and its methods offer functionalities to simulate an in-memory database.
 * It is particularly useful for developers starting with ExpressoTS without any database connection.
 *
 * @decorator @provideSingleton(InMemoryDB)
 */
@provideSingleton(InMemoryDB)
export class InMemoryDB {
    private tables: Record<string, IEntity[]> = {};

    /**
     * getTable Method
     *
     * Retrieves a table by its name from the in-memory database.
     *
     * @param tableName - The name of the table to retrieve.
     * @returns {IEntity[]} - An array of entities.
     */
    public getTable(tableName: string): IEntity[] {
        if (!this.tables[tableName]) {
            this.tables[tableName] = [];
        }
        return this.tables[tableName];
    }

    /**
     * showTables Method
     *
     * Prints a list of all tables in the in-memory database to the standard output.
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
