import { AppExpress, setupAuthorizationForExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { JwtAuthProvider } from "./auth/jwt-auth.provider";
import { AuthController } from "./auth/auth.controller";
import { UserController } from "./users/user.controller";
import { UserRepository } from "./users/user.repository";

export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([AuthController, UserController, UserRepository, JwtAuthProvider]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");
    }

    async configureServices(): Promise<void> {
        this.Middleware.applyPreset("api");

        setupAuthorizationForExpress(
            this.container.Container,
            {
                enablePreloading: true,
                enableCaching: true,
                permissionHierarchy: {
                    admin: ["moderator", "user"],
                    moderator: ["user"],
                },
            },
            this.Middleware,
            JwtAuthProvider,
        );
    }

    async postServerInitialization(): Promise<void> {}

    async serverShutdown(): Promise<void> {}
}
