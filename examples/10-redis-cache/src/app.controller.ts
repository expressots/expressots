import { controller, Get } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { CacheProvider } from "@expressots/cache";

@controller("/")
export class AppController {
    constructor(@inject(CacheProvider) private readonly cache: CacheProvider) {}

    @Get("/")
    welcome() {
        return {
            message: "ExpressoTS Redis cache example",
            example: "10-redis-cache",
            cacheMode: this.cache.mode,
        };
    }

    @Get("/health")
    async health() {
        const cacheHealthy =
            (await this.cache.healthCheck()).status === "healthy";
        return {
            status: cacheHealthy ? "ok" : "degraded",
            cache: {
                mode: this.cache.mode,
                healthy: cacheHealthy,
            },
            uptime: process.uptime(),
        };
    }
}
