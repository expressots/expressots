import fastify, { FastifyInstance } from "fastify";
import middie, { Handler } from "@fastify/middie";
import { Container } from "inversify";


class InversifyFastifyServer {
    private _app: FastifyInstance;
    private _container: Container;
    private _middlewares: Array<Handler> = [];

    constructor(container: Container, middlewares: Array<Handler>, customApp?: FastifyInstance) {
        this._container = container;
        this._app = customApp || fastify({logger: false});
        this._middlewares = middlewares;
    }

    private async setExpressMiddlewares(middlewares: Array<Handler>): Promise<void> {        
        await this._app.register(middie);

        middlewares.forEach((middleware) => {
            console.log(middleware);
            this._app.use(middleware);
        });
    }

    public async build(): Promise<FastifyInstance> {
        // Adding middlewares
        await this.setExpressMiddlewares(this._middlewares);

        return this._app;
    }

   
}

export { InversifyFastifyServer }