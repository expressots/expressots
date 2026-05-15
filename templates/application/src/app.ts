import {
    AppExpress,
    setupInterceptorsForExpress,
    setupEventSystemForExpress,
} from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";
import { LoggingInterceptor } from "@interceptors/logging.interceptor";
import { WelcomeEmailHandler } from "@events/welcome-email.handler";
import { appConfig } from "@config/app.config";

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
        CreateModule([AppController, LoggingInterceptor, WelcomeEmailHandler]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");

        this.logger.configure({
            level: appConfig.values.logger.level,
        });
    }

    async configureServices(): Promise<void> {
        // __MIDDLEWARE_PRESET_PLACEHOLDER__

        // Wire up the v4 interceptor system. Add additional interceptor classes
        // to `customInterceptors` to apply them globally; per-route attachment
        // works via `@UseInterceptors(...)` on a controller method.
        setupInterceptorsForExpress(this.container.Container, {
            builtIn: { performance: appConfig.values.app.env !== "test" },
            customInterceptors: [LoggingInterceptor],
        });

        // Wire up the v4 type-safe event bus. Handlers in `@events/*` annotated
        // with `@OnEvent(EventClass)` are auto-discovered from the container.
        setupEventSystemForExpress(this.container.Container, {
            enableRecording: appConfig.values.app.env !== "production",
            enableFlowTracking: appConfig.values.app.env === "development",
        });

        this.Middleware.setErrorHandler({
            showStackTrace: await this.isDevelopment(),
        });
    }

    async postServerInitialization(): Promise<void> {
        const port = await this.getPort();
        this.logger
            .withContext(appConfig.values.app.name)
            .info(`Listening on http://localhost:${port}`);
    }

    async serverShutdown(): Promise<void> {
        this.logger
            .withContext(appConfig.values.app.name)
            .info("Shutting down gracefully...");
    }
}
