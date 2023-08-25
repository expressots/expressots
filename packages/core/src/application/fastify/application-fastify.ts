import { Container } from "inversify";
import { provide } from "inversify-binding-decorators";
import { IApplicationMessageToConsole } from "../../console/console";
import { ApplicationBase } from "../application-base";
import { ServerEnvironment } from "../express/application-express";
import { IApplicationFastify } from "./application-fastify.interface";

/**
 * The Application class provides a way to configure and manage an Fastify application.
 * @provide Application
 */
@provide(ApplicationFastify)
class ApplicationFastify extends ApplicationBase implements IApplicationFastify {
    private container: Container;
    private middlewares: string[] = [];

    protected configureServices(): void | Promise<void> {}
    protected postServerInitialization(): void | Promise<void> {}
    protected serverShutdown(): void | Promise<void> {}
    
    public async create(
        container: Container,
        middlewares: string[] = []
      ): Promise<ApplicationFastify> {
        this.container = container;
        this.middlewares = middlewares;    
        return Promise.resolve(new ApplicationFastify());
      }

      public async listen(port: number, environment: ServerEnvironment, consoleMessage?: IApplicationMessageToConsole | undefined): Promise<void> {
        console.log("inside of listen")
    }
  

}

export { ApplicationFastify as AppFastify };
