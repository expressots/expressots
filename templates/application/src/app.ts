import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";

/**
 * Application class.
 *
 * Lifecycle order:
 *   globalConfiguration       → pre-DI knobs (banner, route prefix).
 *   configureServices         → register middleware, interceptors, error handler.
 *   postServerInitialization  → HTTP server is listening; warm caches, run probes.
 *   serverShutdown            → graceful drain on SIGTERM / SIGINT.
 *
 * See https://expresso-ts.com/docs/core/lifecycle for the full reference.
 */
export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([AppController]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");
    }

    async configureServices(): Promise<void> {
        // __MIDDLEWARE_PRESET_PLACEHOLDER__
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
