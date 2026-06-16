import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { AppDatabaseProvider } from "./providers/database.provider";
import { UserController } from "./users/user.controller";
import { UserRepository } from "./users/user.repository";

export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([UserController, UserRepository, AppDatabaseProvider]),
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
