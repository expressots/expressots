import { Request, Response } from "express";
import type { Container, interfaces } from "../di/inversify.js";
import type { ExecutionContext } from "./interceptor.interface.js";

/**
 * Implementation of ExecutionContext for Express adapter
 *
 * @layer internal
 * @audience framework-developers
 * @internal
 */
export class ExpressExecutionContext implements ExecutionContext {
  private data: Map<string, unknown> = new Map();

  constructor(
    private request: Request,
    private response: Response,
    private container: Container,
    private controllerClass: NewableFunction,
    private handlerName: string,
  ) {}

  getRequest(): Request {
    return this.request;
  }

  getResponse(): Response {
    return this.response;
  }

  getContainer(): Container {
    return this.container;
  }

  getScoped<T>(
    identifier: interfaces.ServiceIdentifier<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _scopeName?: string,
  ): T {
    return this.container.get<T>(identifier);
  }

  getClass(): NewableFunction {
    return this.controllerClass;
  }

  getHandler(): string {
    return this.handlerName;
  }

  getRoute(): {
    path: string;
    method: string;
    params: Record<string, unknown>;
    query: Record<string, unknown>;
  } {
    return {
      path: this.request.path,
      method: this.request.method,
      params: this.request.params as Record<string, unknown>,
      query: this.request.query as Record<string, unknown>,
    };
  }

  getData<T = unknown>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  setData<T = unknown>(key: string, value: T): void {
    this.data.set(key, value);
  }
}

/**
 * Factory for creating ExecutionContext instances
 *
 * @layer internal
 * @audience framework-developers
 * @internal
 */
export function createExecutionContext(
  request: Request,
  response: Response,
  container: Container,
  controllerClass: NewableFunction,
  handlerName: string,
): ExecutionContext {
  return new ExpressExecutionContext(
    request,
    response,
    container,
    controllerClass,
    handlerName,
  );
}
