import { provideSingleton } from "@expressots/core";
import { Pool } from "pg";

/**
 * Configuration of the database pool.
 */
const pool = {
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "expressots",
};

/**
 * Provider to inject the database pool into the container.
 */
@provideSingleton(PostgresProvider)
export class PostgresProvider {
    public get Pool(): Pool {
        return new Pool(pool);
    }
}
