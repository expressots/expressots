import { Application, Environments, LogLevel, log } from "@expressots/core";
import { TypeORMProvider } from "@providers/orm/typeorm/typeorm.provider";
import { provide } from "inversify-binding-decorators";

@provide(App)
class App extends Application {
    protected configureServices(): void {
        Environments.checkAll();
    }

    protected postServerInitialization(): void {
        TypeORMProvider.connect();
    }

    protected serverShutdown(): void {
        log(LogLevel.Info, "Server is shutting down", "logger-provider");
        super.serverShutdown();
    }
}

const appInstance = new App();

export { appInstance as App };
