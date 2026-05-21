import {
    AppExpress,
    setupEventSystemForExpress,
} from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";
import { WelcomeEmailHandler } from "@events/welcome-email.handler";

/**
 * Application class.
 *
 * Lifecycle order:
 *   globalConfiguration  → runs first; configure pre-DI knobs (banner, prefix).
 *   configureServices    → register middleware, interceptors, events, error handler.
 *   postServerInitialization → HTTP server is listening; warm caches, log readiness.
 *   serverShutdown       → graceful drain on SIGTERM / SIGINT.
 *
 * See https://expresso-ts.com/docs/core/lifecycle for the full lifecycle reference.
 */
export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([AppController, WelcomeEmailHandler]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");
    }

    async configureServices(): Promise<void> {
        // __MIDDLEWARE_PRESET_PLACEHOLDER__

        setupEventSystemForExpress(this.container.Container);
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
