import { Request, Response, NextFunction } from "express";
import { interfaces } from "../di/inversify";
import { ExceptionFilterRegistry } from "./exception-filter-registry";
import { Logger } from "../provider/logger/logger.provider";
import type { ExceptionContext, IExceptionFilter, IHttpContext } from "./exception-filter.interface";
import { AppError, StatusCode } from "./index";
import { EXCEPTION_FILTER_METADATA_KEY } from "./exception-filter-constants";

/**
 * Enhanced error handler middleware that integrates with exception filters
 * Supports route-specific filters, exception type filters, and fallback handling
 */
export class ExceptionHandlerMiddleware {
  private registry?: ExceptionFilterRegistry;
  private container?: interfaces.Container;
  private logger?: Logger;
  private showStackTrace: boolean;

  constructor(
    container?: interfaces.Container,
    registry?: ExceptionFilterRegistry,
    showStackTrace: boolean = false,
  ) {
    this.container = container;
    this.registry = registry;
    this.showStackTrace = showStackTrace;

    if (container) {
      try {
        this.logger = container.get(Logger);
        if (!this.registry) {
          // Try to get registry from container or create new one
          if (container.isBound(ExceptionFilterRegistry)) {
            this.registry = container.get(ExceptionFilterRegistry);
          } else {
            this.registry = new ExceptionFilterRegistry(container, this.logger);
            this.registry.initialize();
          }
        }
      } catch (error) {
        // Container not available or Logger not bound - use fallback
        console.warn("Exception filter registry not available:", error);
      }
    }
  }

  /**
   * Express error handler middleware function
   */
  handle = async (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Build exception context
    const context: ExceptionContext = {
      request: req,
      response: res,
      next,
      route: req.route?.path,
      method: req.method,
    };

    // Try to get HttpContext from request if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((req as any).httpContext) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context.httpContext = (req as any).httpContext as IHttpContext;
      }
    } catch {
      // HttpContext not available
    }

    // Try to extract controller and handler from request metadata (most reliable)
    // This is attached by the handlerFactory during handler execution
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let controllerConstructor = (req as any).__expressotsController;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let methodName = (req as any).__expressotsMethod;

      // Fallback: Try to extract from route stack if not on request
      if (!controllerConstructor) {
        const route = req.route;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (route && (route as any).stack) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stack = (route as any).stack as Array<{ handle?: unknown }>;
          
          // Traverse the stack to find the handler with ExpressoTS metadata
          // The handler is typically the last layer in the stack
          let handler: unknown = null;
          for (let i = stack.length - 1; i >= 0; i--) {
            const layer = stack[i];
            if (layer && layer.handle) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const potentialHandler = layer.handle as any;
              // Check if this handler has ExpressoTS metadata
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (potentialHandler && (potentialHandler as any).__expressotsController) {
                handler = potentialHandler;
                break;
              }
              // If no metadata found yet, use this as fallback
              if (!handler) {
                handler = potentialHandler;
              }
            }
          }

          if (handler) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            controllerConstructor = (handler as any).__expressotsController;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            methodName = (handler as any).__expressotsMethod;
          }
        }
      }

      if (controllerConstructor) {
        // Set controller constructor (required for filter extraction)
        context.controller = controllerConstructor;
        // Extract handler method name
        const handlerMethodName = methodName || "unknownHandler";
        context.handler = handlerMethodName;
        // Store controller constructor for filter extraction (redundant but kept for compatibility)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (context as any).__controllerConstructor = controllerConstructor;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (context as any).__methodName = methodName;
      } else {
        // Fallback: use path-based extraction
        // Note: context.controller remains undefined as we don't have the constructor
        // The handler name is still set for logging purposes
        context.handler = req.route?.path || req.path || "unknownHandler";
      }
    } catch (error) {
      // Could not extract controller info, use path-based fallback
      // Note: context.controller remains undefined as we don't have the constructor
      context.handler = req.path || "unknownHandler";
      
      if (this.logger) {
        this.logger.warn(
          `Could not extract controller/handler info: ${error}. Using path-based fallback.`,
          "exception-handler",
        );
      }
    }

    // Get route-specific filters (method-level, then controller-level)
    const routeFilters = this.getRouteFilters(req);

    // Get exception-type filters from registry
    let exceptionFilters: Array<IExceptionFilter> = [];
    if (this.registry) {
      exceptionFilters = this.registry.getFilters(error);
    }

    // Combine filters (route-specific first, then exception-type)
    const allFilters = [...routeFilters, ...exceptionFilters];

    if (allFilters.length > 0) {
      // Execute filters
      await this.executeFilters(allFilters, error, context);
    } else {
      // Fallback to default handler
      this.defaultHandler(error, context);
    }
  };

  /**
   * Get route-specific exception filters
   * Extracts method-level filters (highest priority) and controller-level filters
   */
  private getRouteFilters(req: Request): Array<IExceptionFilter> {
    const filters: Array<IExceptionFilter> = [];

    if (!this.container) {
      return filters;
    }

    try {
      // First, try to get controller and method from request metadata (most reliable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let controllerConstructor = (req as any).__expressotsController;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let methodName = (req as any).__expressotsMethod;

      // Fallback: Try to extract from route stack if not on request
      if (!controllerConstructor) {
        const route = req.route;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (route && (route as any).stack) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stack = (route as any).stack as Array<{ handle?: unknown }>;
          
          // Traverse the stack to find the handler with ExpressoTS metadata
          // The handler is typically the last layer in the stack
          let handler: unknown = null;
          for (let i = stack.length - 1; i >= 0; i--) {
            const layer = stack[i];
            if (layer && layer.handle) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const potentialHandler = layer.handle as any;
              // Check if this handler has ExpressoTS metadata
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (potentialHandler && (potentialHandler as any).__expressotsController) {
                handler = potentialHandler;
                break;
              }
              // If no metadata found yet, use this as fallback
              if (!handler) {
                handler = potentialHandler;
              }
            }
          }

          if (handler) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            controllerConstructor = (handler as any).__expressotsController;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            methodName = (handler as any).__expressotsMethod;
          }
        }
      }

      if (controllerConstructor) {
        // Get method-level filters (highest priority)
        // Method filters are stored on the controller constructor with the method name as key
        const methodFilters =
          Reflect.getMetadata(
            EXCEPTION_FILTER_METADATA_KEY.methodExceptionFilters,
            controllerConstructor,
            methodName,
          ) as Array<new (...args: Array<unknown>) => IExceptionFilter> | undefined;

        if (methodFilters && methodFilters.length > 0) {
          methodFilters.forEach((FilterClass: new (...args: Array<unknown>) => IExceptionFilter) => {
            try {
              const filterInstance = this.instantiateFilter(FilterClass);
              if (filterInstance) {
                filters.push(filterInstance);
              }
            } catch (error) {
              // Could not instantiate filter
              if (this.logger) {
                this.logger.warn(
                  `Failed to instantiate method-level filter ${FilterClass.name}: ${error}`,
                  "exception-handler",
                );
              }
            }
          });
        }

        // Get controller-level filters (added after method-level filters)
        // Controller filters are stored directly on the controller constructor
        const controllerFilters =
          Reflect.getMetadata(
            EXCEPTION_FILTER_METADATA_KEY.controllerExceptionFilters,
            controllerConstructor,
          ) as Array<new (...args: Array<unknown>) => IExceptionFilter> | undefined;

        if (controllerFilters && controllerFilters.length > 0) {
          controllerFilters.forEach((FilterClass: new (...args: Array<unknown>) => IExceptionFilter) => {
            try {
              const filterInstance = this.instantiateFilter(FilterClass);
              if (filterInstance) {
                // Only add if not already added (avoid duplicates)
                if (!filters.some((f) => f.constructor === FilterClass)) {
                  filters.push(filterInstance);
                }
              }
            } catch (error) {
              // Could not instantiate filter
              if (this.logger) {
                this.logger.warn(
                  `Failed to instantiate controller-level filter ${FilterClass.name}: ${error}`,
                  "exception-handler",
                );
              }
            }
          });
        }
      }
    } catch (error) {
      // Could not extract route filters
      if (this.logger) {
        this.logger.warn(`Failed to extract route filters: ${error}`, "exception-handler");
      }
    }

    return filters;
  }

  /**
   * Instantiate an exception filter, trying container first, then direct instantiation
   */
  private instantiateFilter(
    FilterClass: new (...args: Array<unknown>) => IExceptionFilter,
  ): IExceptionFilter | null {
    try {
      if (this.container!.isBound(FilterClass)) {
        return this.container!.get<IExceptionFilter>(FilterClass);
      } else {
        // Try to instantiate directly
        const instance = new FilterClass();
        // Try to inject dependencies if possible
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (this.container!.isBound(Logger) && (instance as any).logger === undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (instance as any).logger = this.container!.get(Logger);
        }
        // Try to inject Report provider if available
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (this.container!.isBound("Report") && (instance as any).report === undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (instance as any).report = this.container!.get("Report");
          }
        } catch {
          // Report not available, skip
        }
        return instance;
      }
    } catch (error) {
      if (this.logger) {
        this.logger.warn(`Failed to instantiate filter ${FilterClass.name}: ${error}`, "exception-handler");
      }
      return null;
    }
  }

  /**
   * Execute exception filters in order
   */
  private async executeFilters(
    filters: Array<IExceptionFilter>,
    exception: Error,
    context: ExceptionContext,
  ): Promise<void> {
    for (const filter of filters) {
      try {
        await filter.catch(exception, context);
        // If filter handled the exception (response sent), stop processing
        if (context.response.headersSent) {
          return;
        }
      } catch (filterError) {
        // Log filter error but continue to next filter
        if (this.logger) {
          this.logger.error(
            `Exception filter ${filter.constructor.name} threw an error: ${filterError}`,
            "exception-handler",
          );
        } else {
          console.error(`Exception filter error:`, filterError);
        }
      }
    }

    // If no filter handled it, use default
    if (!context.response.headersSent) {
      this.defaultHandler(exception, context);
    }
  }

  /**
   * Default error handler (fallback)
   */
  private defaultHandler(exception: Error, context: ExceptionContext): void {
    if (context.response.headersSent) {
      return;
    }

    if (exception instanceof AppError) {
      const responseBody: Record<string, unknown> = {
        code: exception.statusCode,
        error: exception.message,
      };

      // Include stack trace if showStackTrace is enabled
      if (this.showStackTrace && exception.stack) {
        responseBody.stack = exception.stack;
      }

      context.response.status(exception.statusCode).json(responseBody);
    } else {
      const responseBody: Record<string, unknown> = {
        code: StatusCode.InternalServerError,
        error: "An unexpected error occurred.",
      };

      // Include stack trace if showStackTrace is enabled
      if (this.showStackTrace && exception.stack) {
        responseBody.stack = exception.stack;
      }

      context.response.status(StatusCode.InternalServerError).json(responseBody);
    }
  }
}

