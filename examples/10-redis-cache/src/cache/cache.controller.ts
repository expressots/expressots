import {
    controller,
    Get,
    Post,
    param,
    body,
} from "@expressots/adapter-express";
import { inject, NotFoundError, ValidationErrorClass } from "@expressots/core";
import { CacheProvider } from "@expressots/cache";

interface SetCacheDto {
    value: string;
    ttlSeconds?: number;
}

@controller("/cache")
export class CacheController {
    constructor(@inject(CacheProvider) private readonly cache: CacheProvider) {}

    @Get("/:key")
    async get(@param("key") key: string) {
        const value = await this.cache.get(key);
        if (value === undefined) {
            throw new NotFoundError("Cache entry", key);
        }

        return { key, value, mode: this.cache.mode };
    }

    @Post("/:key")
    async set(@param("key") key: string, @body() dto: SetCacheDto) {
        if (
            dto.ttlSeconds !== undefined &&
            (typeof dto.ttlSeconds !== "number" ||
                !Number.isSafeInteger(dto.ttlSeconds * 1000) ||
                dto.ttlSeconds < 0)
        ) {
            throw new ValidationErrorClass([
                {
                    property: "ttlSeconds",
                    messages: [
                        "Must be non-negative seconds representable as integer milliseconds",
                    ],
                },
            ]);
        }
        await this.cache.set(
            key,
            dto.value,
            dto.ttlSeconds === undefined ? undefined : dto.ttlSeconds * 1000,
        );
        return {
            key,
            stored: true,
            mode: this.cache.mode,
            ttlSeconds: dto.ttlSeconds ?? null,
        };
    }
}
