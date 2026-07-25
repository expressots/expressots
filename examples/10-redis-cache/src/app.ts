import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";
import { CacheController } from "./cache/cache.controller";
import { RedisCacheProvider } from "@providers/cache/redis-cache.provider";

export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([AppController, CacheController, RedisCacheProvider]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");
    }

    async configureServices(): Promise<void> {
        this.Middleware.applyPreset("api");
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
