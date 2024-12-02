/* eslint-disable @typescript-eslint/no-namespace */
import { Server as HTTPServer } from "http";
import { IConsoleMessage } from "./console.interface";
import { Environment, IEnvironment } from "./environment.interface";
import { RenderEngine } from "./render/render.types";

/**
 * Namespace for the Server Application.
 * @namespace Server
 * @public API
 */
export namespace Server {
  /**
   * Interface for the WebServer application implementation.
   */
  export interface IWebServer {
    initEnvironment(environment: Environment, options?: IEnvironment): void;

    listen(port: number | string, appInfo?: IConsoleMessage): Promise<IWebServerPublic>;

    setEngine<T extends RenderEngine.EngineOptions>(
      engine: RenderEngine.Engine,
      options?: T,
    ): Promise<void>;
  }

  /**
   * Constructor type for IWebServer.
   */
  export interface IWebServerConstructor<T extends IWebServer> {
    new (): T;
  }

  /**
   * Interface for the WebServerBuilder.
   * @public API
   */
  export interface IWebServerBuilder {
    /**
     * Start listening on the given port.
     * @param port - The port number to listen on.
     * @param consoleMessage - Optional App info message to display on startup.
     */
    listen(port: number | string, consoleMessage?: IConsoleMessage): Promise<IWebServerPublic>;
  }

  /**
   * Public Interface for the WebServer application.
   * @public API
   */
  export interface IWebServerPublic {
    /**
     * Get the underlying HTTP server. (default: Express.js)
     * @returns The underlying HTTP server after initialization.
     * @public API
     */
    getHttpServer(): Promise<HTTPServer>;
  }
}

export type IWebServer = Server.IWebServer;
export type IWebServerConstructor<T extends IWebServer> = Server.IWebServerConstructor<T>;
export type IWebServerBuilder = Server.IWebServerBuilder;
export type IWebServerPublic = Server.IWebServerPublic;
