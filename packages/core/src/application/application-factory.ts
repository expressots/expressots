import express from "express";
import { Container } from "inversify";
import { Logger } from "../provider/logger/logger-service";
import { AppExpress } from "./express/application-express";
import { IApplicationFastify } from "./fastify/application-fastify.interface";
import { AppFastify } from "./fastify/application-fastify";
import { IApplicationExpress } from "./express/application-express.interface";

type HttpServer = AppExpress | AppFastify;

/**
 * AppFactory Class
 * 
 * Responsible for creating an instance of the Application, 
 * either using a custom application type or with provided middlewares.
 */
class AppFactory {
    private static logger: Logger = new Logger();
    /**
     * Creates an instance of the application using a custom application type.
     * @param container - InversifyJS container to resolve dependencies.
     * @param CustomAppType - Custom application class extending Application.
     * @returns Instance of the application.
     */
    public static async create<T extends AppExpress>(container: Container, CustomAppType: new ()=> T, httpServerFactory?: new () => T): Promise<IApplicationExpress>;
    public static async create<T extends AppFastify>(container: Container, CustomAppType: new ()=> T, httpServerFactory?: new () => T): Promise<IApplicationFastify>;

    /**
     * Creates an instance of the application with provided middlewares.
     * @param container - InversifyJS container to resolve dependencies.
     * @param middlewares - Array of Express middlewares to be applied.
     * @returns Instance of the application.
     */
    public static async create<T extends AppExpress>(container: Container, middlewares: express.RequestHandler[], httpServerFactory?: new () => T): Promise<IApplicationExpress>;
    public static async create<T extends AppFastify>(container: Container, middlewares: express.RequestHandler[], httpServerFactory?: new () => T): Promise<IApplicationFastify>;

    /**
     * Implementation of the create method, handling both overloads.
     * @param container - InversifyJS container to resolve dependencies.
     * @param appTypeOrMiddlewares - Custom application class or array of middlewares.
     * @returns Instance of the application.
     */
    public static async create<T extends HttpServer>(container: Container, appTypeOrMiddlewares?: (new ()=> T) | express.RequestHandler[], httpServerFactory?: new () => T): Promise<IApplicationExpress | IApplicationFastify> {
        let app: AppExpress | AppFastify = {} as AppExpress | AppFastify;
        
        if (!httpServerFactory || httpServerFactory === AppExpress) {
            // Using custom application class - opinionated
            if (typeof appTypeOrMiddlewares === "function") {
                app = container.resolve(appTypeOrMiddlewares);
                app.create(container, []);
                return app as IApplicationExpress;
            }
            // Using middlewares - non-opinionated
            app = container.get<AppExpress>(AppExpress);
            app.create(container, appTypeOrMiddlewares as express.RequestHandler[]);
            return app as IApplicationExpress;
        } else {
            // Using custom application class - opinionated
            if (typeof appTypeOrMiddlewares === "function") {
                app == container.resolve(appTypeOrMiddlewares);
                return app as IApplicationFastify;
            }
            // Using middlewares - non-opinionated
            app = container.get<AppFastify>(AppFastify);
            app.create(container, [] as string[]);
            return app as IApplicationFastify;
        }        
    }
}

export { AppFactory };

