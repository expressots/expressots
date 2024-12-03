import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, Env } from "@expressots/core";
import { AppModule } from "@useCases/app/app.module";

export class App extends AppExpress {
    private config: AppContainer = this.configContainer([AppModule]);

    async globalConfiguration(): Promise<void> {
        this.setGlobalRoutePrefix("/v1");

        this.initEnvironment("development", {
            env: {
                development: ".env.development",
                production: ".env.production",
            },
        });
    }

    async configureServices(): Promise<void> {
        this.Provider.register(Env);

        this.Middleware.addBodyParser();
        this.Middleware.setErrorHandler({ showStackTrace: true });
    }

    async postServerInitialization(): Promise<void> {
        if (await this.isDevelopment()) {
            this.Provider.get(Env).checkFile(".env.development");
        }
    }

    async serverShutdown(): Promise<void> {}
}
