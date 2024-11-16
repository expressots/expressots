/* eslint-disable @typescript-eslint/no-namespace */
import express from "express";
import { Environment, IEnvironment } from "./environment.interface";
import { IConsoleMessage } from "./console.interface";
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

    listen(port: number | string, appInfo?: IConsoleMessage): Promise<void>;

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
   * Public Interface for the WebServer application.
   * @public API
   */
  export interface IWebServerPublic {
    /**
     * Start listening on the given port.
     * @param port - The port number to listen on.
     * @param consoleMessage - Optional App info message to display on startup.
     */
    listen(port: number | string, consoleMessage?: IConsoleMessage): Promise<void>;

    /**
     * Get the underlying HTTP server. (default: Express.js)
     * @returns The underlying HTTP server after initialization.
     * @public API
     */
    getHttpServer(): Promise<express.Application>;
  }
}

export type IWebServer = Server.IWebServer;
export type IWebServerConstructor<T extends IWebServer> = Server.IWebServerConstructor<T>;
export type IWebServerPublic = Server.IWebServerPublic;
