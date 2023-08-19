import express from "express";
import { Container } from "inversify";
import { Application } from "./application";
import { IApplication } from "./application.interfaces";

/**
 * AppFactory Class
 * 
 * Responsible for creating an instance of the Application, 
 * either using a custom application type or with provided middlewares.
 */
class AppFactory {
    /**
     * Creates an instance of the application using a custom application type.
     * @param container - InversifyJS container to resolve dependencies.
     * @param CustomAppType - Custom application class extending Application.
     * @returns Instance of the application.
     */
    public static async create<T extends Application>(container: Container, CustomAppType?: new ()=> T): Promise<IApplication>;

    /**
     * Creates an instance of the application with provided middlewares.
     * @param container - InversifyJS container to resolve dependencies.
     * @param middlewares - Array of Express middlewares to be applied.
     * @returns Instance of the application.
     */
    public static async create<T extends Application>(container: Container, middlewares: express.RequestHandler[]): Promise<IApplication>;

    /**
     * Implementation of the create method, handling both overloads.
     * @param container - InversifyJS container to resolve dependencies.
     * @param appTypeOrMiddlewares - Custom application class or array of middlewares.
     * @returns Instance of the application.
     */
    public static async create<T extends Application>(container: Container, appTypeOrMiddlewares?: (new ()=> T) | express.RequestHandler[]): Promise<IApplication> {
        let app: Application;
        
        if (typeof appTypeOrMiddlewares === "function") {
            app = container.resolve(appTypeOrMiddlewares);
            app.create(container);
            return app as IApplication;
        }

        app = container.get<Application>(Application);
        app.create(container, appTypeOrMiddlewares as express.RequestHandler[]);
      
        return app as IApplication;
    }
}

export { AppFactory };

