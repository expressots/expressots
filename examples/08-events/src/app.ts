import { AppExpress, setupEventSystemForExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { AppController } from "./app.controller";
import { WelcomeEmailHandler } from "@events/welcome-email.handler";
import { UserController } from "./users/user.controller";
import { UserService } from "./users/user.service";

export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([AppController, UserController, UserService, WelcomeEmailHandler]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");
    }

    async configureServices(): Promise<void> {
        this.Middleware.applyPreset("api");

        setupEventSystemForExpress(this.container.Container, {
            enableRecording: true,
        });
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
