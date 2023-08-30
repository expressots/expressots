import { FastifyInstance, FastifyPluginAsync, FastifyPluginCallback } from 'fastify';
import express from 'express';
import { Container } from "inversify";
import { provide } from "inversify-binding-decorators";
import { Console, IApplicationMessageToConsole } from "../../console/console";
import { ApplicationBase } from "../application-base";
import { ServerEnvironment } from "../express/application-express";
import { IApplicationFastify } from "./application-fastify.interface";
import { InversifyFastifyServer } from "./fastify-utils/inversify-fastify-server";
import { IMiddleware, Middleware } from '../../middleware/middleware-services';
import { Handler } from '@fastify/middie';

export type FastifyPlugin = FastifyPluginCallback | FastifyPluginAsync;

/**
 * The Application class provides a way to configure and manage an Fastify application.
 * @provide Application
 */
@provide(ApplicationFastify)
class ApplicationFastify extends ApplicationBase implements IApplicationFastify {
    private app: FastifyInstance;
    private port: number;
    private environment: ServerEnvironment;
    private container: Container;
    private middlewares: Array<Handler> = [];
    private plugins: Array<FastifyPluginCallback> = [];
    
    protected configureServices(): void | Promise<void> {}
    protected postServerInitialization(): void | Promise<void> {}
    protected serverShutdown(): void | Promise<void> {}

     /**
   * Handles process exit by calling serverShutdown and then exiting the process.
   */
    private handleExit(): void {
      this.serverShutdown();
      process.exit(0);
    }
    
    public async create(
        container: Container,
        expressMiddlewares: Array<Handler> = []
      ): Promise<ApplicationFastify> {
        this.container = container;

        await Promise.resolve(this.configureServices());

        const middleware = container.get<IMiddleware>(Middleware);
        this.middlewares.push(...expressMiddlewares, ...middleware.getMiddlewares() as Array<Handler>);

        const serverInstance = new InversifyFastifyServer(this.container, this.middlewares);

        this.app = await serverInstance.build();

        return this;
    }

    public async listen(port: number, environment: ServerEnvironment, consoleMessage?: IApplicationMessageToConsole | undefined): Promise<void> {
        this.port = port;
        this.environment = environment;
        
      this.app.listen({ port: this.port }, () => {
        const console: Console = this.container.get<Console>(Console);
        console.messageServer(this.port, this.environment, consoleMessage);

        (["SIGTERM", "SIGHUP", "SIGBREAK", "SIGQUIT", "SIGINT"] as NodeJS.Signals[]).forEach((signal) => {
          process.on(signal, this.handleExit.bind(this));
        });
      });
      await Promise.resolve(this.postServerInitialization());  
    }

    public get FastifyApp(): FastifyInstance {
      return this.app;
    }
}

export { ApplicationFastify as AppFastify };
