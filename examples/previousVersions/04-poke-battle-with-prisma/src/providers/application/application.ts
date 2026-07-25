import { Application, Environments, LogLevel, log } from "@expressots/core";
import { provide } from "inversify-binding-decorators";

@provide(App)
class App extends Application {
  protected configureServices(): void {
    Environments.checkAll();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected postServerInitialization(): void {}

  protected serverShutdown(): void {
    log(LogLevel.Info, "Server is shutting down", "logger-provider");
    super.serverShutdown();
  }
}

const appInstance = new App();

export { appInstance as App };
