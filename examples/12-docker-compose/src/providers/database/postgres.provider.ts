import {
    provideSingleton,
    IBootstrap,
    IShutdown,
    Logger,
} from "@expressots/core";
import { Pool } from "pg";

@provideSingleton(PostgresProvider)
export class PostgresProvider implements IBootstrap, IShutdown {
    private readonly logger = new Logger().withContext("PostgresProvider");
    private pool: Pool | null = null;

    get mode(): "postgres" | "unconfigured" {
        return this.pool ? "postgres" : "unconfigured";
    }

    get Pool(): Pool | null {
        return this.pool;
    }

    async bootstrap(): Promise<void> {
        const host = process.env.DB_HOST?.trim();

        if (!host) {
            this.logger.info("DB_HOST not set; postgres provider skipped");
            return;
        }

        this.pool = new Pool({
            host,
            port: Number(process.env.DB_PORT ?? 5432),
            database: process.env.DB_NAME ?? "expressots",
            user: process.env.DB_USER ?? "postgres",
            password: process.env.DB_PASSWORD ?? "postgres",
        });

        await this.pool.query("SELECT 1");
        this.logger.info("Postgres pool connected");
    }

    async ping(): Promise<boolean> {
        if (!this.pool) {
            return false;
        }

        try {
            await this.pool.query("SELECT 1");
            return true;
        } catch {
            return false;
        }
    }

    async shutdown(signal?: NodeJS.Signals): Promise<void> {
        this.logger.info(`Closing postgres pool (${signal ?? "manual"})`);
        await this.pool?.end();
        this.pool = null;
    }
}
