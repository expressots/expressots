import {
    IBootstrap,
    IEntity,
    IShutdown,
    InMemoryDBProvider,
    provideSingleton,
} from "@expressots/core";

/**
 * DI-friendly wrapper around InMemoryDBProvider (composition, not extension).
 * The core class is not @injectable; wrapping avoids DI metadata errors.
 */
@provideSingleton(AppDatabaseProvider)
export class AppDatabaseProvider implements IBootstrap, IShutdown {
    private readonly inner = new InMemoryDBProvider();

    table<T extends IEntity>(name: string) {
        return this.inner.table<T>(name);
    }

    async bootstrap(): Promise<void> {
        await this.inner.bootstrap();
    }

    async shutdown(): Promise<void> {
        await this.inner.shutdown();
    }
}
