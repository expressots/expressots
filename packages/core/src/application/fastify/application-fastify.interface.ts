import { IApplicationMessageToConsole } from "../../console/console";
import { RenderTemplateOptions } from "../../render";
import { ServerEnvironment } from "../express/application-express";

/**
 * Interface representing the Application class for Fastify
 * @interface IApplicationFastify
 */
interface IApplicationFastify {
   listen(port: number, environment: ServerEnvironment, consoleMessage?: IApplicationMessageToConsole): Promise<void> | void;
}

export { IApplicationFastify };
