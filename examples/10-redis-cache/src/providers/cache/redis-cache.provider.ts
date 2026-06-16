import {
    provideSingleton,
    IBootstrap,
    IShutdown,
    Logger,
} from "@expressots/core";
import IORedis from "ioredis";

interface MemoryEntry {
    value: string;
    expiresAt?: number;
}

@provideSingleton(RedisCacheProvider)
export class RedisCacheProvider implements IBootstrap, IShutdown {
    private readonly logger = new Logger().withContext("RedisCacheProvider");
    private client: IORedis | null = null;
    private readonly memory = new Map<string, MemoryEntry>();
    private useRedis = false;

    get mode(): "redis" | "memory" {
        return this.useRedis ? "redis" : "memory";
    }

    async bootstrap(): Promise<void> {
        const redisUrl = process.env.REDIS_URL?.trim();

        if (!redisUrl) {
            this.logger.info("REDIS_URL not set; using in-memory cache fallback");
            this.useRedis = false;
            return;
        }

        try {
            this.client = new IORedis(redisUrl);
            await this.client.ping();
            this.useRedis = true;
            this.logger.info("Redis cache connected via REDIS_URL");
        } catch (error) {
            this.logger.warn(
                `Redis unavailable (${error instanceof Error ? error.message : String(error)}); using in-memory cache fallback`,
            );
            await this.disconnectRedis();
            this.useRedis = false;
        }
    }

    async get(key: string): Promise<string | null> {
        if (this.useRedis && this.client) {
            return this.client.get(key);
        }

        const entry = this.memory.get(key);
        if (!entry) {
            return null;
        }

        if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
            this.memory.delete(key);
            return null;
        }

        return entry.value;
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (this.useRedis && this.client) {
            if (ttlSeconds !== undefined && ttlSeconds > 0) {
                await this.client.set(key, value, "EX", ttlSeconds);
            } else {
                await this.client.set(key, value);
            }
            return;
        }

        const entry: MemoryEntry = {
            value,
            expiresAt:
                ttlSeconds !== undefined && ttlSeconds > 0
                    ? Date.now() + ttlSeconds * 1000
                    : undefined,
        };
        this.memory.set(key, entry);
    }

    async del(key: string): Promise<boolean> {
        if (this.useRedis && this.client) {
            const removed = await this.client.del(key);
            return removed > 0;
        }

        return this.memory.delete(key);
    }

    async ping(): Promise<boolean> {
        if (this.useRedis && this.client) {
            try {
                const response = await this.client.ping();
                return response === "PONG";
            } catch {
                return false;
            }
        }

        return true;
    }

    async shutdown(signal?: NodeJS.Signals): Promise<void> {
        this.logger.info(`Shutting down cache provider (${signal ?? "manual"})`);
        await this.disconnectRedis();
        this.memory.clear();
    }

    private async disconnectRedis(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.client = null;
        }
    }
}
