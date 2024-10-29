import { AppExpress } from "@expressots/adapter-express";
import {
    Env,
    IMiddleware,
    Middleware,
    ProviderManager,
} from "@expressots/core";
import { container } from "./app.container";

export class App extends AppExpress {
    private middleware: IMiddleware;
    private provider: ProviderManager;

    constructor() {
        super();
        this.middleware = container.get<IMiddleware>(Middleware);
        this.provider = container.get(ProviderManager);
    }

    protected configureServices(): void | Promise<void> {
        this.provider.register(Env);

        this.middleware.addBodyParser();
        this.middleware.setErrorHandler({ showStackTrace: true });
    }

    protected postServerInitialization(): void | Promise<void> {
        if (this.isDevelopment()) {
            this.provider.get(Env).checkAll();
        }
    }

    protected serverShutdown(): void | Promise<void> {}
}
