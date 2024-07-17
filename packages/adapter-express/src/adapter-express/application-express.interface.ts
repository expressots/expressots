import { IApplicationMessageToConsole } from "@expressots/core";
import express from "express";
import { ServerEnvironment } from "./application-express.types";

/**
 * Public Interface for the WebServer application.
 */
export interface IWebServerPublic {
  /**
   * Start listening on the given port and environment.
   * @param port - The port number to listen on.
   * @param environment - The server environment.
   * @param consoleMessage - Optional message to display in the console.
   */
  listen(
    port: number,
    environment: ServerEnvironment,
    consoleMessage?: IApplicationMessageToConsole,
  ): Promise<void>;

  /**
   * Get the underlying HTTP server. (default: Express.js)
   * @returns The underlying HTTP server after initialization.
   */
  getHttpServer(): Promise<express.Application>;
}
