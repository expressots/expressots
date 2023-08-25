import { provide } from "inversify-binding-decorators";
import { ApplicationBase } from "../application-base";
import { IApplicationFastify } from "./application-fastify.interface";
import { Container } from "inversify";
import { IApplicationMessageToConsole } from "../../console/console";
import { IHandlebars } from "../../render";
import { ServerEnvironment } from "../express/application-express";

/**
 * The Application class provides a way to configure and manage an Fastify application.
 * @provide Application
 */
@provide(ApplicationFastify)
class ApplicationFastify extends ApplicationBase implements IApplicationFastify {
    listen(port: number, environment: ServerEnvironment, consoleMessage?: IApplicationMessageToConsole | undefined): void | Promise<void> {
        throw new Error("Method not implemented.");
    }
    setEngine<T extends IHandlebars>(options: T): void {
        throw new Error("Method not implemented.");
    }
    
    protected configureServices(): void | Promise<void> {}
    protected postServerInitialization(): void | Promise<void> {}
    protected serverShutdown(): void | Promise<void> {}
    
    public async create(
        container: Container,
        middlewares: string[] = []
      ): Promise<ApplicationFastify> {
        return Promise.resolve(this);
      }

}

export { ApplicationFastify as AppFastify };