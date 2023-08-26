import express from "express";
import { Container } from "inversify";
import { Logger } from "../provider/logger/logger-service";
import { AppExpress } from "./express/application-express";
import { IApplicationExpress } from "./express/application-express.interface";
import { AppFastify } from "./fastify/application-fastify";
import { IApplicationFastify } from "./fastify/application-fastify.interface";

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
    public static async create(container: Container, CustomAppType: new ()=> AppExpress, httpServerFactory?: new () => AppExpress): Promise<IApplicationExpress>;
    public static async create(container: Container, CustomAppType: new ()=> AppFastify, httpServerFactory?: new () => AppFastify): Promise<IApplicationFastify>;

    /**
     * Creates an instance of the application with provided middlewares.
     * @param container - InversifyJS container to resolve dependencies.
     * @param middlewares - Array of Express middlewares to be applied.
     * @returns Instance of the application.
     */
    public static async create(container: Container, middlewares: express.RequestHandler[], httpServerFactory?: new () => AppExpress): Promise<AppExpress>;
    public static async create(container: Container, middlewares: express.RequestHandler[], httpServerFactory?: new () => AppFastify): Promise<AppFastify>;

    /**
     * Implementation of the create method, handling both overloads.
     * @param container - InversifyJS container to resolve dependencies.
     * @param appTypeOrMiddlewares - Custom application class or array of middlewares.
     * @returns Instance of the application.
     */
    public static async create(container: Container, appTypeOrMiddlewares: (new ()=> AppExpress | AppFastify) | express.RequestHandler[], httpServerFactory?: new () => AppExpress | AppFastify): Promise<IApplicationExpress | IApplicationFastify | AppExpress | AppFastify> {
        let app: AppExpress | AppFastify = {} as AppExpress | AppFastify;
        
        if (this.isOpinionated(appTypeOrMiddlewares)) {
            switch (httpServerFactory) {
                case AppExpress:
                    app = container.resolve(appTypeOrMiddlewares as new () => AppExpress);
                    app.create(container);
                    return app as IApplicationExpress;
                case AppFastify:
                    app = container.resolve(appTypeOrMiddlewares as new () => AppFastify);
                    app.create(container);
                    return app as IApplicationFastify;
                default:
                    app = container.resolve(appTypeOrMiddlewares as new () => AppExpress);
                    app.create(container);
                    return app as IApplicationExpress;
            }
        } else {
            switch (httpServerFactory) {
                case AppExpress:
                    app = container.get<AppExpress>(AppExpress);
                    app.create(container, appTypeOrMiddlewares as express.RequestHandler[]);
                    return app as AppExpress;
                case AppFastify:
                    app = container.get<AppFastify>(AppFastify);
                    app.create(container, [] as string[]);
                    return app as AppFastify;
                default:
                    app = container.get<AppExpress>(AppExpress);
                    app.create(container, appTypeOrMiddlewares as express.RequestHandler[]);
                    return app as AppExpress;
            }
        }
    }

    /**
     * Checks if the provided parameter is a custom application type.
     * @param appTypeOrMiddlewares - Custom application class or array of middlewares.
     * @returns True if the provided parameter is a custom application type.
     */
    private static isOpinionated<T>(appTypeOrMiddlewares: (new () => T) | express.RequestHandler[]): boolean {
        return typeof appTypeOrMiddlewares === "function";
    }
}

export { AppFactory };

