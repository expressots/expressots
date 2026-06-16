import { controller, Get } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { RedisCacheProvider } from "@providers/cache/redis-cache.provider";

@controller("/")
export class AppController {
    constructor(@inject(RedisCacheProvider) private readonly cache: RedisCacheProvider) {}

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
        const cacheHealthy = await this.cache.ping();
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
