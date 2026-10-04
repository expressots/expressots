import {
    AppExpress,
    setupAuthorizationForExpress,
} from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { JwtProvider, MemoryRefreshStore } from "@expressots/jwt";
import { AuthController } from "./auth/auth.controller";
import { UserController } from "./users/user.controller";
import { UserRepository } from "./users/user.repository";

export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([
            AuthController,
            UserController,
            UserRepository,
            JwtProvider,
        ]),
    ]);
    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");
    }
    async configureServices(): Promise<void> {
        this.Middleware.applyPreset("api");
        this.Middleware.setErrorHandler();
        const jwt = this.container.Container.get(JwtProvider);
        const result = jwt.configure({
            refreshStore: new MemoryRefreshStore(),
        });
        if (!result.valid) throw new Error(result.errors?.join("; "));
        setupAuthorizationForExpress(
            this.container.Container,
            { enablePreloading: false },
            this.Middleware,
        );
        this.Middleware.session({ type: "jwt" });
    }
    async postServerInitialization(): Promise<void> {}
    async serverShutdown(): Promise<void> {}
}
