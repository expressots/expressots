import { IBootstrap, IShutdown, Logger, provideSingleton } from "@expressots/core";
import { Pool, type PoolClient } from "pg";

@provideSingleton(PostgresProvider)
export class PostgresProvider implements IBootstrap, IShutdown {
    private pool!: Pool;
    private readonly logger = new Logger();

    async bootstrap(): Promise<void> {
        this.pool = new Pool({
            host: process.env.DB_HOST ?? "localhost",
            port: Number(process.env.DB_PORT ?? 5432),
            database: process.env.DB_NAME ?? "expressots",
            user: process.env.DB_USER ?? "postgres",
            password: process.env.DB_PASSWORD ?? "postgres",
            max: 20,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 2_000,
        });

        await this.pool.query("SELECT 1");
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        this.logger.info("Postgres pool ready", "PostgresProvider");
    }

    async shutdown(): Promise<void> {
        await this.pool.end();
        this.logger.info("Postgres pool closed", "PostgresProvider");
    }

    query<T extends object>(sql: string, params?: Array<unknown>): Promise<Array<T>> {
        return this.pool.query<T>(sql, params).then((result) => result.rows);
    }

    async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            const result = await fn(client);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
}
