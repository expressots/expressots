import fastify, { FastifyInstance } from "fastify";
import middie, { Handler } from "@fastify/middie";
import { Container } from "inversify";
import { FastifyPlugin } from "../application-fastify";


class InversifyFastifyServer {
    private _app: FastifyInstance;
    private _container: Container;
    private _middlewares: Array<Handler> = [];
    private _plugins: Map<FastifyPlugin, any> = new Map();

    constructor(container: Container, middlewares: Array<Handler>, plugins: Map<FastifyPlugin, any>, customApp?: FastifyInstance) {
        this._container = container;
        this._app = customApp || fastify({logger: false});
        this._middlewares = middlewares;
        this._plugins = plugins;
    }

    private async setExpressMiddlewares(middlewares: Array<Handler>): Promise<void> {        
        await this._app.register(middie);

        middlewares.forEach((middleware) => {
            this._app.use(middleware);
        });
    }

    private async setPlugins(plugins: Map<FastifyPlugin, any>): Promise<void> {       
        plugins.forEach((options, plugin) => {
            if (plugin !== undefined){
                this._app.register(plugin, options);
            }
        });
    }

    public async build(): Promise<FastifyInstance> {
        // Adding plugins
        await this.setPlugins(this._plugins);

        // Adding middlewares
        await this.setExpressMiddlewares(this._middlewares);

        return this._app;
    }

   
}

export { InversifyFastifyServer }