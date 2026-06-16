import { controller, Get } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { PostgresProvider } from "@providers/database/postgres.provider";

@controller("/")
export class AppController {
    constructor(@inject(PostgresProvider) private readonly postgres: PostgresProvider) {}

    @Get("/")
    welcome() {
        return {
            message: "ExpressoTS Docker Compose example",
            example: "12-docker-compose",
            database: this.postgres.mode,
        };
    }

    @Get("/health")
    async health() {
        const dbHealthy = await this.postgres.ping();

        return {
            status: dbHealthy ? "ok" : "degraded",
            database: {
                mode: this.postgres.mode,
                healthy: dbHealthy,
            },
            uptime: process.uptime(),
        };
    }
}
