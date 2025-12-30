import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";

export class App extends AppExpress {
    private container: AppContainer = this.configContainer([
        CreateModule([AppController]),
    ]);

    async globalConfiguration(): Promise<void> {}

    async configureServices(): Promise<void> {
        // Add middleware
        this.Middleware.addBodyParser();
        this.Middleware.setErrorHandler({
            showStackTrace: await this.isDevelopment(),
        });
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
