import {
    AppExpress,
    setupInterceptorsForExpress,
} from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";
import { LoggingInterceptor } from "@interceptors/logging.interceptor";
import { appConfig } from "@config/app.config";

/**
 * Application class.
 *
 * Lifecycle order:
 *   globalConfiguration       → pre-DI knobs (banner, route prefix, log level).
 *   configureServices         → register middleware, interceptors, error handler.
 *   postServerInitialization  → HTTP server is listening; warm caches, run probes.
 *   serverShutdown            → graceful drain on SIGTERM / SIGINT.
 *
 * See https://expresso-ts.com/docs/core/lifecycle for the full reference.
 */
export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([AppController, LoggingInterceptor]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");

        this.logger.configure({
            level: appConfig.values.logger.level,
        });
    }

    async configureServices(): Promise<void> {
        // __MIDDLEWARE_PRESET_PLACEHOLDER__

        setupInterceptorsForExpress(this.container.Container, {
            builtIn: { performance: appConfig.values.app.env !== "test" },
            customInterceptors: [LoggingInterceptor],
        });

        this.Middleware.setErrorHandler({
            showStackTrace: await this.isDevelopment(),
        });
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
