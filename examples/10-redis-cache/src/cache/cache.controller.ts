import { controller, Get, Post, param, body } from "@expressots/adapter-express";
import { inject, NotFoundError } from "@expressots/core";
import { RedisCacheProvider } from "@providers/cache/redis-cache.provider";

interface SetCacheDto {
    value: string;
    ttlSeconds?: number;
}

@controller("/cache")
export class CacheController {
    constructor(@inject(RedisCacheProvider) private readonly cache: RedisCacheProvider) {}

    @Get("/:key")
    async get(@param("key") key: string) {
        const value = await this.cache.get(key);
        if (value === null) {
            throw new NotFoundError("Cache entry", key);
        }

        return { key, value, mode: this.cache.mode };
    }

    @Post("/:key")
    async set(@param("key") key: string, @body() dto: SetCacheDto) {
        await this.cache.set(key, dto.value, dto.ttlSeconds);
        return {
            key,
            stored: true,
            mode: this.cache.mode,
            ttlSeconds: dto.ttlSeconds ?? null,
        };
    }
}
