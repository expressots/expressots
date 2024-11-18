import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";

export class App extends AppExpress {
    private config: AppContainer = this.configContainer([
        CreateModule([AppController]),
    ]);

    protected globalConfiguration(): void | Promise<void> {
        this.setGlobalRoutePrefix("/v1");
    }

    protected configureServices(): void {
        this.Middleware.addBodyParser();
        this.Middleware.setErrorHandler({ showStackTrace: true });
    }

    protected async postServerInitialization(): Promise<void> {}

    protected serverShutdown(): void {}
}