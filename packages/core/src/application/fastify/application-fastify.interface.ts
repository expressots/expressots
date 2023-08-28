import { IApplicationMessageToConsole } from "../../console/console";
import { ServerEnvironment } from "../express/application-express";

/**
 * Interface representing the Application class for Fastify
 * @interface IApplicationFastify
 */
interface IApplicationFastify {

   /**
    * Method to start the application
    * @param {number} port The port to listen on
    * @param {ServerEnvironment} environment The environment to run the application in
    * @param {IApplicationMessageToConsole} [consoleMessage] The message to display to the console
    * @returns {Promise<void> | void}
    */
   listen(port: number, environment: ServerEnvironment, consoleMessage?: IApplicationMessageToConsole): Promise<void> | void;
}

export { IApplicationFastify };