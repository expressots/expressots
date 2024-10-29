import express from "express";
import { IConsoleMessage } from "@expressots/core";

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
