import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule, Logger } from "@expressots/core";
import { AppController } from "./app.controller";
import { config } from "./config";

export class App extends AppExpress {
    private container: AppContainer = this.configContainer([
        CreateModule([AppController]),
    ]);

    async globalConfiguration(): Promise<void> {
        this.setGlobalRoutePrefix(config.server.globalPrefix);
    }

    async configureServices(): Promise<void> {
        const logger = this.Provider.get(Logger);
        logger.configure({
            level: config.logging.level.toUpperCase() as any,
        });

        // Add middleware
        this.Middleware.addBodyParser();
        this.Middleware.setErrorHandler({
            showStackTrace: await this.isDevelopment(),
        });
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
