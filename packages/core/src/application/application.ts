import express from "express";
import { Container } from "inversify";
import { provide } from "inversify-binding-decorators";
import { InversifyExpressServer } from "inversify-express-utils";
import process from "process";
import { Console, IApplicationMessageToConsole } from "../console/console";
import errorHandler from "../error/error-handler-middleware";

/**
 * Enum representing possible server environments.
 */
enum ServerEnvironment {
    Development = "development",
    Staging = "staging",
    Production = "production"
}

/**
 * The Application class provides a way to configure and manage an Express application.
 * @provide Application
 */
@provide(Application)
class Application {

    private app: express.Application;
    private port: number;
    private environment: ServerEnvironment;

    /**
     * Constructs a new instance of the Application class.
     */
    constructor() { }

    /**
     * Configure services that should be initialized before the server starts.
     */
    protected configureServices(): void { }

    /**
     * Configure services that should be executed after the server starts.
     */
    protected postServerInitialization(): void { }

    /**
     * Perform actions or cleanup after the server is shutdown.
     */
    protected serverShutdown(): void {
        process.exit(0);
    }

    /**
     * Create and configure the Express application.
     * @param container - The InversifyJS container.
     * @param middlewares - An array of Express middlewares to be applied.
     * @returns The configured Application instance.
     */
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

    /**
     * Start listening on the given port and environment.
     * @param port - The port number to listen on.
     * @param environment - The server environment.
     * @param consoleMessage - Optional message to display in the console.
     */
    public listen(port: number, environment: ServerEnvironment, consoleMessage?: IApplicationMessageToConsole): void {
        this.port = port;
        this.environment = environment;

        this.app.listen(this.port, () => {

            new Console().messageServer(this.port, this.environment, consoleMessage);

            process.on("SIGINT", this.serverShutdown.bind(this));
        });

        this.postServerInitialization();
    }
}

const appServerInstance: Application = new Application();

export { appServerInstance as AppInstance, Application, ServerEnvironment };

