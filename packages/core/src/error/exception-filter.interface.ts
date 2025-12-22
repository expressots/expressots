import { Request, Response, NextFunction } from "express";

/**
 * Generic HTTP context interface (adapter-agnostic)
 * Adapters can extend this with their specific context types
 */
export interface IHttpContext {
  container?: unknown;
  request: Request;
  response: Response;
  user?: unknown;
}

/**
 * Exception context providing comprehensive information about the error occurrence
 */
export interface ExceptionContext {
  /**
   * Express request object
   */
  request: Request;

  /**
   * Express response object
   */
  response: Response;

  /**
   * Express next function
   */
  next: NextFunction;

  /**
   * Controller class where the error occurred (if available)
   */
  controller?: NewableFunction;

  /**
   * Handler method name where the error occurred (if available)
   */
  handler?: string;

  /**
   * Route path where the error occurred (if available)
   */
  route?: string;

  /**
   * HTTP method where the error occurred (if available)
   */
  method?: string;

  /**
   * HTTP context with container, request, response, and user (if available)
   * This is adapter-specific and optional to avoid circular dependencies
   */
  httpContext?: IHttpContext;
}

/**
 * Exception filter interface for handling specific exception types
 */
export interface IExceptionFilter {
  /**
   * Handles the exception
   * @param exception - The exception that was thrown
   * @param context - The exception context with request/response information
   */
  catch(exception: Error, context: ExceptionContext): void | Promise<void>;
}

/**
 * Type for any Error constructor (allows any parameter signature)
 * Using any[] is necessary here to accept error constructors with varying parameter types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ErrorConstructor = new (...args: Array<any>) => Error;

/**
 * Metadata for exception filter registration
 */
export interface ExceptionFilterMetadata {
  /**
   * Exception types this filter handles
   */
  exceptionTypes: Array<ErrorConstructor>;

  /**
   * The filter class
   */
  filter: NewableFunction;
}

