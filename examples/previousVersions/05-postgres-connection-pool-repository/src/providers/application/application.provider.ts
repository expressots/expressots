import { IMiddleware, Middleware, IProvider, Provider } from "@expressots/core";
import { AppExpress } from "@expressots/adapter-express";
import { provide } from "inversify-binding-decorators";
import { container } from "../../app.container";

@provide(App)
export class App extends AppExpress {
    private middleware: IMiddleware;
    private provider: IProvider;

    constructor() {
        super();
        this.middleware = container.get<IMiddleware>(Middleware);
        this.provider = container.get<IProvider>(Provider);
    }

    protected configureServices(): void {
        this.middleware.addBodyParser();
        this.middleware.setErrorHandler();
    }

    protected postServerInitialization(): void {
        if (this.isDevelopment()) {
            this.provider.envValidator.checkAll();
        }
    }

    protected serverShutdown(): void {}
}
