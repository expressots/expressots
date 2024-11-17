import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, Env } from "@expressots/core";
import { AppModule } from "@useCases/app/app.module";

export class App extends AppExpress {
    private config: AppContainer = this.configContainer([AppModule]);

    protected globalConfiguration(): void | Promise<void> {
        this.setGlobalRoutePrefix("/v1");
        
        this.initEnvironment("development", {
            env: {
                development: ".env",
                production: ".env"
            }
        });
    }

    protected configureServices(): void {
        this.Provider.register(Env);

        this.Middleware.addBodyParser();
        this.Middleware.setErrorHandler({showStackTrace: true});
    }

    protected async postServerInitialization(): Promise<void> {
        if (this.isDevelopment()) {
            this.Provider.get(Env).checkFile(".env");
        }
    }

    protected serverShutdown(): void {}
}
