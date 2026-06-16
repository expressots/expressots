import { AppExpress, setupAuthorizationForExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { JwtAuthProvider } from "./auth/jwt-auth.provider";
import { AuthController } from "./auth/auth.controller";
import { UserPermissionService } from "./auth/user-permission.service";
import { AdminController } from "./admin/admin.controller";
import { DocumentsController } from "./documents/documents.controller";
import { UserRepository } from "./users/user.repository";

export class App extends AppExpress {
    private readonly container: AppContainer = this.configContainer([
        CreateModule([
            AuthController,
            AdminController,
            DocumentsController,
            UserRepository,
            UserPermissionService,
            JwtAuthProvider,
        ]),
    ]);

    globalConfiguration(): void {
        this.setGlobalRoutePrefix("/api");
    }

    async configureServices(): Promise<void> {
        this.Middleware.applyPreset("api");

        const di = this.container.Container;
        if (!di.isBound("IPermissionService")) {
            di.bind("IPermissionService")
                .to(UserPermissionService as never)
                .inSingletonScope();
        }

        setupAuthorizationForExpress(
            di,
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
