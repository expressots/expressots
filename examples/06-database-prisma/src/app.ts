import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule, Scope } from "@expressots/core";
import { PrismaProvider } from "./providers/prisma.provider";
import { UserController } from "./users/user.controller";
import { UserRepository } from "./users/user.repository";

export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([UserController, UserRepository, PrismaProvider]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");
    }

    async configureServices(): Promise<void> {
        this.Middleware.applyPreset("api");
        this.Provider.register(PrismaProvider, Scope.Singleton);
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
