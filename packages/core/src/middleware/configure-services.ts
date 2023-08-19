import express from "express";
import { provideSingleton } from "../decorator/index";
import { OptionsJson } from "./interfaces/bodyparser.interface";
import { CorsOptions } from "./interfaces/cors.interface";
import { middlewareResolver } from "./middleware-resolver";

/**
 * Interface for configuring and managing middlewares in the application.
 * Provides methods to be added automatically in the application without the need to import packages.
 */
interface IConfigure {
    /**
     * Adds a Body Parser middleware to the middleware collection.
     * The body parser is responsible for parsing the incoming request bodies in a middleware.
     * 
     * @param options - Optional configuration options for the JSON body parser.
     */
    addBodyParser(options?: OptionsJson): void;
    
    addCors(options?: CorsOptions): void;

    //addStatic(): void;
    /**
     * Retrieves all the middlewares that have been added.
     * 
     * @returns An array of Express request handlers representing the middlewares.
     */
    getMiddlewares(): express.RequestHandler[];
}

/**
 * Singleton class that implements the IConfigure interface.
 * Manages the middleware configuration for the application,
 * including adding Body Parser and retrieving all configured middlewares.
 * 
 * @see IConfigure
 */
@provideSingleton(Configure)
class Configure implements IConfigure {    
    private middlewares: express.RequestHandler[] = [];

    /**
     * Adds a Body Parser middleware to the middleware collection using the given options.
     * 
     * @param options - Optional configuration options for the JSON body parser.
     */
    public addBodyParser(options?: OptionsJson): void {
        this.middlewares.push(express.json(options));
    }

    addCors(options?: CorsOptions): void {
        const middleware = middlewareResolver("cors", options);
        
        if (middleware) {
            this.middlewares.push(middleware);
        }
    }

    
    /* addStatic(): void {
        this.middlewares.push(express.static("public"));
    } */

    /**
     * Retrieves all the middlewares that have been added to the collection.
     * 
     * @returns An array of Express request handlers representing the middlewares.
     */
    public getMiddlewares(): express.RequestHandler[] {
        return this.middlewares;
    }
}

export { Configure, IConfigure };

