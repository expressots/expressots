import { Application, IProvider, Provider } from "@expressots/core";
import { provide } from "inversify-binding-decorators";
import { container } from "../../app.container";

@provide(App)
class App extends Application {
    private provider: IProvider;

    constructor() {
        super();
        this.provider = container.get<IProvider>(Provider);
    }

    protected configureServices(): void {
        this.provider.envValidator.checkAll();
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected postServerInitialization(): void {}

    protected serverShutdown(): void {
        this.provider.logger.info(
            "Shutting down server!",
            "application-provider",
        );
        super.serverShutdown();
    }
}

const appInstance = new App();

export { appInstance as App };
