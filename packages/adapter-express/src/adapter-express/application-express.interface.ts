import express, { Request, Response, NextFunction } from "express";
import { IConsoleMessage } from "@expressots/core";
import { Engine, EngineOptions } from "./render/engine";
import { Environment } from "./application-express.types";

/**
 * ExpressoTS Class middleware interface.
 */
export interface IExpressoMiddleware {
  //readonly name: string;
  use(req: Request, res: Response, next: NextFunction): Promise<void> | void;
}

/**
 * Interface for environment configuration options.
 * @public API
 */
export interface IEnvironment {
  env: {
    development?: string;
    production?: string;
  };
}

/**
 * Interface for the WebServer application implementation.
 */
export interface IWebServer {
  //configure(container: interfaces.Container): Promise<void>;

  initEnvironment(environment: Environment, options?: IEnvironment): void;

  listen(port: number | string, appInfo?: IConsoleMessage): Promise<void>;

  setEngine<T extends EngineOptions>(engine: Engine, options?: T): Promise<void>;
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
   * Start listening on the given port and environment.
   * @param port - The port number to listen on.
   * @param environment - Environment. (default: ServerEnvironment.Development)
   * @param consoleMessage - Optional message to display in the console.
   */
  listen(port: number | string, consoleMessage?: IConsoleMessage): Promise<void>;

  /**
   * Get the underlying HTTP server. (default: Express.js)
   * @returns The underlying HTTP server after initialization.
   * @public API
   */
  getHttpServer(): Promise<express.Application>;
}

