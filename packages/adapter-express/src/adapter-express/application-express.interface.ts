import express from "express";
import { IConsoleMessage } from "@expressots/core";
import { Environment } from "./application-express.types";

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
  listen(): Promise<void>;
  listen(port: number): Promise<void>;
  listen(environment: Environment): Promise<void>;
  listen(consoleMessage: IConsoleMessage): Promise<void>;
  listen(port: number, environment: Environment): Promise<void>;
  listen(port: number, consoleMessage: IConsoleMessage): Promise<void>;
  listen(environment: Environment, consoleMessage: IConsoleMessage): Promise<void>;
  listen(port: number, environment: Environment, consoleMessage: IConsoleMessage): Promise<void>;

  /**
   * Get the underlying HTTP server. (default: Express.js)
   * @returns The underlying HTTP server after initialization.
   */
  getHttpServer(): Promise<express.Application>;
}
