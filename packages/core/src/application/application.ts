import express from "express";
import { Container } from "inversify";
import { provide } from "inversify-binding-decorators";
import { InversifyExpressServer } from "inversify-express-utils";
import process from "process";
import { Console, IApplicationMessageToConsole } from "../console/console";
import errorHandler from "../error/error-handler-middleware";
import { Report } from "../error";
import { LogLevel, log } from "../logger";

enum ServerEnvironment {
    Development = "development",
    Staging = "staging",
    Production = "production"
}

@provide(Application)
class Application {

    private app: express.Application;
    private port: number;
    private environment: ServerEnvironment;

    constructor() { }

    /* Add any service that you want to be initialized before the server starts */
    protected configureServices(): void { }

    /* Add any service that you want to execute after the server starts */
    protected postServerInitialization(): void { }

    /* Add any service that you want to execute after server is shutdown */
    protected serverShutdown(): void {
        process.exit(0);
    }

    public create(container: Container, middlewares: express.RequestHandler[] = []): Application {

        this.configureServices();

        const expressServer = new InversifyExpressServer(container);

        expressServer.setConfig((app: express.Application) => {

            /* Default body parser application/json */
            app.use(express.json());

            /* Default body parser application/x-www-form-urlencoded */
            app.use(express.urlencoded({ extended: true }));

            middlewares.forEach(middleware => {
                app.use(middleware);
            });
        });

        this.app = expressServer.build();
        
        /* Add the error handler middleware */
        this.app.use(errorHandler);

        return this;
    }

    public listen(port: number, environment: ServerEnvironment, consoleMessage?: IApplicationMessageToConsole): void {
        this.port = port;
        this.environment = environment;

        this.app.listen(this.port, () => {

            new Console().messageServer(this.port, this.environment, consoleMessage);

            process.on('uncaughtException', error => {
                try {
                    Report.Error(error)
                } catch {
                    this.serverShutdown()
                }
            })

            process.on("SIGINT", this.serverShutdown.bind(this));
        });

        this.postServerInitialization();
    }
}

const appServerInstance: Application = new Application();

export { appServerInstance as AppInstance, Application, ServerEnvironment };
