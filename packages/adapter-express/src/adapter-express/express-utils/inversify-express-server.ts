/* eslint-disable @typescript-eslint/no-unused-vars */
import express, {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import {
  interfaces,
  Middleware as MiddlewareClass,
  ContentNegotiationService,
  GuardExecutor,
  ContextManager,
  findFlowTracker,
  NotFoundError,
  InterceptorExecutor,
  InterceptorRegistry,
  INTERCEPTOR_METADATA_KEY,
  Logger,
  getErrorHints,
  getDefaultSuggestionsConfig,
  formatSuggestions,
} from "@expressots/core";
import type { SuggestionsConfig } from "@expressots/core";
import type { InterceptorClass, IInterceptor } from "@expressots/core";
import { GuardContextFactory } from "./guard-context-factory.js";
import { BaseMiddleware } from "./base-middleware.js";
import {
  getControllersFromMetadata,
  getControllersFromContainer,
  getControllerMetadata,
  getControllerMethodMetadata,
  getControllerParameterMetadata,
  instanceOfIHttpActionResult,
  getContentNegotiationMetadata,
} from "./utils.js";
import { getValidationMetadata } from "./validation-decorators.js";
import {
  TYPE,
  METADATA_KEY,
  DEFAULT_ROUTING_ROOT_PATH,
  PARAMETER_TYPE,
  DUPLICATED_CONTROLLER_NAME,
} from "./constants.js";
import { HttpResponseMessage } from "./httpResponseMessage.js";

import type {
  AuthProvider,
  BaseController,
  ConfigFunction,
  ControllerHandler,
  ControllerMethodMetadata,
  ExtractedParameters,
  HttpContext,
  IExpressoMiddleware,
  Middleware,
  NewableFunction,
  ParameterMetadata,
  Principal,
  RoutingConfig,
} from "./interfaces.js";
import type { OutgoingHttpHeaders } from "node:http";
import { getRenderMetadata } from "./decorators.js";
import {
  isConditionalMiddleware,
  type ConditionalMiddlewareConfig,
} from "./conditional-middleware.js";
import { isComposedMiddleware, type ComposedMiddlewareConfig } from "./middleware-composition.js";
import { getControllerGuards, getMethodGuards } from "./guard-utils.js";
import { GuardMiddleware } from "./guard-middleware.js";

import { ValidationService } from "./validation-service.js";
import { InterceptorMiddleware, createInterceptorMiddleware } from "./interceptor-middleware.js";
import { getHttpContext, setHttpContext } from "./http-context-store.js";

// Lazy-load route registry from @expressots/core. Static import because
// `getRouteRegistry` is part of the core's public surface; we just guard
// against it being undefined to keep this non-critical (suggestions are
// optional).
import { getRouteRegistry as coreGetRouteRegistry } from "@expressots/core";

function getRouteRegistryModule(): {
  getRouteRegistry: () => { register: (method: string, path: string, fullPath: string) => void };
} | null {
  if (typeof coreGetRouteRegistry !== "function") return null;
  return { getRouteRegistry: coreGetRouteRegistry };
}

/**
 * Properly join route path segments, handling:
 * - Controller "/" + method "/users" = "/users"
 * - Controller "/api" + method "users" = "/api/users"
 * - Controller "/api/" + method "/users" = "/api/users"
 * - Controller "/" + method "/" = "/"
 */
function joinRoutePaths(...segments: Array<string | undefined>): string {
  const parts: Array<string> = [];

  for (const segment of segments) {
    if (!segment || segment === "") continue;

    // For root path only, skip if we have parts
    if (segment === "/" && parts.length > 0) continue;

    // Remove trailing slash
    let cleaned = segment.endsWith("/") && segment.length > 1 ? segment.slice(0, -1) : segment;

    // Handle leading slash
    if (parts.length > 0) {
      // Ensure leading slash for non-first segments
      cleaned = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
    } else {
      // First segment - ensure starts with /
      cleaned = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
    }

    if (cleaned && cleaned !== "/") {
      parts.push(cleaned);
    } else if (parts.length === 0) {
      parts.push("/");
    }
  }

  if (parts.length === 0) return "/";

  // Join and normalize double slashes
  return parts.join("").replace(/\/+/g, "/");
}

export class InversifyExpressServer {
  private _router: Router;
  private _container: interfaces.Container;
  private _app: Application;
  private _configFn!: ConfigFunction;
  private _errorConfigFn!: ConfigFunction;
  private _routingConfig: RoutingConfig;
  private _AuthProvider!: new () => AuthProvider;
  private _forceControllers: boolean;
  private _contentNegotiationService?: ContentNegotiationService;
  private _validationService?: ValidationService;

  /**
   * Wrapper for the express server.
   *
   * @param container Container loaded with all controllers and their dependencies.
   * @param customRouter optional express.Router custom router
   * @param routingConfig optional interfaces.RoutingConfig routing config
   * @param customApp optional express.Application custom app
   * @param authProvider optional interfaces.AuthProvider auth provider
   * @param forceControllers optional boolean setting to force controllers (defaults do true)
   */
  constructor(
    container: interfaces.Container,
    customRouter?: Router | null,
    routingConfig?: RoutingConfig | null,
    customApp?: Application | null,
    authProvider?: (new () => AuthProvider) | null,
    forceControllers = true,
  ) {
    this._container = container;
    this._forceControllers = forceControllers;
    this._router = customRouter || Router();
    this._routingConfig = routingConfig || {
      rootPath: DEFAULT_ROUTING_ROOT_PATH,
    };
    this._app = customApp || express();
    if (authProvider) {
      this._AuthProvider = authProvider;
      container.bind<AuthProvider>(TYPE.AuthProvider).to(this._AuthProvider);
    }
  }

  /**
   * Sets the configuration function to be applied to the application.
   * Note that the config function is not actually executed until a call to
   * InversifyExpresServer.build().
   *
   * This method is chainable.
   *
   * @param fn Function in which app-level middleware can be registered.
   */
  public setConfig(fn: ConfigFunction): InversifyExpressServer {
    this._configFn = fn;
    return this;
  }

  /**
   * Sets the error handler configuration function to be applied to the application.
   * Note that the error config function is not actually executed until a call to
   * InversifyExpressServer.build().
   *
   * This method is chainable.
   *
   * @param fn Function in which app-level error handlers can be registered.
   */
  public setErrorConfig(fn: ConfigFunction): InversifyExpressServer {
    this._errorConfigFn = fn;
    return this;
  }

  /**
   * Applies all routes and configuration to the server, returning the express application.
   */
  public build(): express.Application {
    // The very first middleware to be invoked: create an HttpContext per
    // request and attach it via a WeakMap (see ./http-context-store).
    // This is cheaper than the previous `Reflect.defineMetadata` call
    // because it bypasses reflect-metadata's string-keyed map.
    //
    // We use `app.use(handler)` (no path arg) which runs for every request
    // regardless of method or path — the same behavior as the previous
    // `app.all("*", ...)` registration but without a path-to-regexp pattern,
    // so it is forward-compatible with Express 5 / path-to-regexp v8.
    this._app.use((req: Request, res: Response, next: NextFunction) => {
      this._createHttpContext(req, res, next)
        .then((httpContext) => {
          setHttpContext(req, httpContext);
          next();
        })
        .catch(next);
    });

    // register server-level middleware before anything else
    if (this._configFn) {
      this._configFn.apply(undefined, [this._app]);
    }

    this.registerControllers();

    this.registerNotFoundHandler();

    // register error handlers after controllers
    if (this._errorConfigFn) {
      this._errorConfigFn.apply(undefined, [this._app]);
    }

    return this._app;
  }

  /**
   * Install a catch-all 404 handler that runs after every registered route.
   *
   * When the user has the suggestions feature enabled (default in development),
   * this consults the route registry, computes "Did you mean ...?" suggestions
   * via `getErrorHints` from `@expressots/core`, logs them through the framework
   * Logger, and returns a structured RFC-7807-style JSON 404 instead of the
   * default Express HTML.
   *
   * Users who want the legacy Express HTML 404 can opt out by configuring the
   * Logger with `suggestions.enabled = false` (this also disables the JSON
   * envelope so they can install their own 404 handler in the error-config fn).
   *
   * @private
   */
  private registerNotFoundHandler(): void {
    this._app.use((req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        return next();
      }

      const suggestionsConfig = this.resolveSuggestionsConfig();

      if (!suggestionsConfig.enabled) {
        return next();
      }

      const requestedPath = req.originalUrl || req.url;
      const requestedMethod = req.method;

      const hints = getErrorHints(
        new Error(`Route '${requestedMethod} ${requestedPath}' not found`),
        {
          path: requestedPath,
          method: requestedMethod,
          statusCode: 404,
        },
        suggestionsConfig,
      );

      if (hints.length > 0) {
        try {
          const formatted = formatSuggestions(hints);
          if (formatted) {
            const logger = this.resolveLogger();
            if (logger) {
              logger.warn(
                `Route not found: ${requestedMethod} ${requestedPath}${formatted}`,
                "router-404",
              );
            } else {
              // eslint-disable-next-line no-console
              console.warn(
                `[router-404] Route not found: ${requestedMethod} ${requestedPath}${formatted}`,
              );
            }
          }
        } catch {
          // Suggestion logging is best-effort; never fail the request because of it.
        }
      }

      const routeSuggestion = hints.find((hint) => hint.type === "route");
      const actionHint = hints.find((hint) => hint.type === "hint");

      const body: Record<string, unknown> = {
        type: "https://expressots.dev/errors/not-found",
        title: "Route Not Found",
        status: 404,
        detail: `Route '${requestedMethod} ${requestedPath}' does not exist`,
        instance: requestedPath,
        timestamp: new Date().toISOString(),
      };

      if (routeSuggestion?.routes && routeSuggestion.routes.length > 0) {
        body.suggestions = routeSuggestion.routes.map((suggestion) => ({
          method: suggestion.route.method,
          path: suggestion.route.fullPath || suggestion.route.path,
          similarity: Math.round(suggestion.similarity * 100),
          reason: suggestion.reason,
        }));
      } else if (actionHint?.actions && actionHint.actions.length > 0) {
        body.actions = actionHint.actions;
      }

      res.status(404).type("application/json").send(JSON.stringify(body));
    });
  }

  /**
   * Resolve the user-configured suggestions config, falling back to the
   * env-aware default when the Logger is not bound or has no overrides.
   *
   * @private
   */
  private resolveSuggestionsConfig(): SuggestionsConfig {
    const fallback = getDefaultSuggestionsConfig();
    const logger = this.resolveLogger();
    if (!logger) {
      return fallback;
    }
    try {
      const loggerConfig = (
        logger as unknown as { getConfig?: () => { suggestions?: Partial<SuggestionsConfig> } }
      ).getConfig?.();
      if (loggerConfig?.suggestions) {
        return { ...fallback, ...loggerConfig.suggestions };
      }
    } catch {
      // Logger may not expose getConfig in older versions; fall through.
    }
    return fallback;
  }

  /**
   * Resolve the framework Logger from DI when available.
   *
   * @private
   */
  private resolveLogger(): Logger | undefined {
    try {
      // The `Logger` symbol is the constructor itself in our DI bindings.
      if (this._container.isBound(Logger)) {
        return this._container.get<Logger>(Logger);
      }
    } catch {
      // not bound yet
    }
    return undefined;
  }

  private registerControllers(): void {
    // Fake HttpContext is needed during registration
    this._container.bind<HttpContext>(TYPE.HttpContext).toConstantValue({} as HttpContext);

    // Initialize interceptor system if not already bound
    this.initializeInterceptorSystem();

    const constructors = getControllersFromMetadata();

    constructors.forEach((constructor) => {
      const { name } = constructor as { name: string };

      if (this._container.isBoundNamed(TYPE.Controller, name)) {
        throw new Error(DUPLICATED_CONTROLLER_NAME(name));
      }

      this._container
        .bind(TYPE.Controller)
        .to(constructor as new (...args: Array<unknown>) => unknown)
        .whenTargetNamed(name);
    });

    const controllers = getControllersFromContainer(this._container, this._forceControllers);

    controllers.forEach((controller: BaseController) => {
      const controllerMetadata = getControllerMetadata(controller.constructor);
      const methodMetadata = getControllerMethodMetadata(controller.constructor);
      const parameterMetadata = getControllerParameterMetadata(controller.constructor);

      if (controllerMetadata && methodMetadata) {
        const controllerMiddleware = this.resolveMiddleware(...controllerMetadata.middleware);

        methodMetadata.forEach((metadata: ControllerMethodMetadata) => {
          let paramList: Array<ParameterMetadata> = [];
          if (parameterMetadata) {
            paramList = parameterMetadata[metadata.key] || [];
          }

          // Create base handler
          let handler: express.RequestHandler = this.handlerFactory(
            (controllerMetadata.target as { name: string }).name,
            metadata.key,
            paramList,
            controller.constructor as NewableFunction, // Pass controller constructor for metadata
            metadata, // Pass method metadata for route-specific filters
          );

          // Wrap handler with interceptor middleware if interceptors are defined
          const interceptors = this.extractInterceptors(
            controller.constructor as NewableFunction,
            metadata.key,
          );

          if (interceptors.length > 0 && this.isInterceptorSystemReady()) {
            handler = this.wrapWithInterceptors(
              handler,
              controller.constructor as NewableFunction,
              metadata.key,
            );
          }

          const routeMiddleware = this.resolveMiddleware(...metadata.middleware);

          // Determine version: method-level version overrides controller-level version
          const version = metadata.version || controllerMetadata.version;
          const versionPrefix = version ? `/${version}` : "";

          // Properly join paths to avoid issues like "/api" + "users" = "/apiusers"
          const routePath = joinRoutePaths(versionPrefix, controllerMetadata.path, metadata.path);
          const fullPath = joinRoutePaths(this._routingConfig.rootPath, routePath);

          // Register route for suggestions system (synchronous approach)
          try {
            const module = getRouteRegistryModule();
            if (module && module.getRouteRegistry) {
              const registry = module.getRouteRegistry();
              registry.register(metadata.method, routePath, fullPath);
            }
          } catch {
            // Route registry not available, skip registration (non-critical)
            // This allows the app to work even if suggestions module isn't available
          }

          this._router[metadata.method](
            routePath,
            ...controllerMiddleware,
            ...routeMiddleware,
            handler,
          );
        });
      }
    });

    this._app.use(this._routingConfig.rootPath, this._router);
  }

  /**
   * Initialize the interceptor system by binding required components
   * @private
   */
  private initializeInterceptorSystem(): void {
    try {
      // Bind InterceptorRegistry if not already bound
      if (!this._container.isBound(InterceptorRegistry)) {
        this._container.bind(InterceptorRegistry).toSelf().inSingletonScope();
      }

      // Bind InterceptorExecutor if not already bound
      if (!this._container.isBound(InterceptorExecutor)) {
        this._container.bind(InterceptorExecutor).toSelf().inSingletonScope();
      }

      // Bind InterceptorMiddleware if not already bound
      if (!this._container.isBound(InterceptorMiddleware)) {
        this._container.bind(InterceptorMiddleware).toSelf().inSingletonScope();
      }
    } catch {
      // Interceptor system initialization failed (non-critical)
      // Routes will work without interceptors
    }
  }

  /**
   * Check if the interceptor system is properly initialized
   * @private
   */
  private isInterceptorSystemReady(): boolean {
    try {
      return (
        this._container.isBound(InterceptorExecutor) &&
        this._container.isBound(InterceptorMiddleware)
      );
    } catch {
      return false;
    }
  }

  /**
   * Extract interceptors from controller and method metadata
   * @private
   */
  private extractInterceptors(
    controllerClass: NewableFunction,
    methodName: string,
  ): Array<InterceptorClass | IInterceptor | unknown> {
    try {
      // Get controller-level interceptors
      const controllerInterceptors =
        (Reflect.getMetadata(
          INTERCEPTOR_METADATA_KEY.controllerInterceptors,
          controllerClass,
        ) as Array<InterceptorClass | IInterceptor | unknown>) || [];

      // Get method-level interceptors
      const methodInterceptors =
        (Reflect.getMetadata(
          INTERCEPTOR_METADATA_KEY.methodInterceptors,
          controllerClass,
          methodName,
        ) as Array<InterceptorClass | IInterceptor | unknown>) || [];

      // Combine: controller + method level
      return [...controllerInterceptors, ...methodInterceptors];
    } catch {
      return [];
    }
  }

  /**
   * Wrap a handler with interceptor middleware
   * @private
   */
  private wrapWithInterceptors(
    handler: express.RequestHandler,
    controllerClass: NewableFunction,
    methodName: string,
  ): express.RequestHandler {
    try {
      const interceptorMiddleware = createInterceptorMiddleware(
        this._container as unknown as interfaces.Container,
        controllerClass,
        methodName,
        handler as (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
      );

      return interceptorMiddleware as express.RequestHandler;
    } catch {
      // Fall back to original handler if interceptor wrapping fails
      return handler;
    }
  }

  /**
   * Checks if a middleware item is a class constructor (not an instance).
   * Handles classes that extend ExpressoMiddleware (which has abstract use method).
   * Note: Abstract methods don't exist at runtime, so we check for concrete implementations.
   */
  private isMiddlewareClass(
    middlewareItem: Middleware,
  ): middlewareItem is new () => IExpressoMiddleware {
    // Must be a function (class constructor)
    if (typeof middlewareItem !== "function") {
      return false;
    }

    // Must not be a conditional or composed middleware config
    if (isConditionalMiddleware(middlewareItem) || isComposedMiddleware(middlewareItem)) {
      return false;
    }

    // Must have a prototype
    if (middlewareItem.prototype === undefined) {
      return false;
    }

    // Check if it has a 'use' method in its prototype
    // Classes that extend ExpressoMiddleware must implement the abstract use() method
    // so it will be in the prototype at runtime
    const prototype = middlewareItem.prototype;

    // Check for 'use' method directly in prototype (most common case)
    if ("use" in prototype && typeof (prototype as { use?: unknown }).use === "function") {
      return true;
    }

    // Also check prototype chain in case use() is defined in a parent class
    // This handles cases where the method might be inherited (optimized: only if not found directly)
    let currentPrototype = Object.getPrototypeOf(prototype);
    while (currentPrototype && currentPrototype !== Object.prototype) {
      if (
        "use" in currentPrototype &&
        typeof (currentPrototype as { use?: unknown }).use === "function"
      ) {
        return true;
      }
      currentPrototype = Object.getPrototypeOf(currentPrototype);
    }

    return false;
  }

  private isExpressoMiddleware(middlewareItem: Middleware): middlewareItem is IExpressoMiddleware {
    return (
      typeof middlewareItem === "object" &&
      middlewareItem !== null &&
      "use" in middlewareItem &&
      typeof middlewareItem.use === "function" &&
      !isConditionalMiddleware(middlewareItem) &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !this.isMiddlewareClass(middlewareItem as any)
    );
  }

  private resolveMiddleware(...middleware: Array<Middleware>): Array<express.RequestHandler> {
    return middleware.map((middlewareItem) => {
      // Handle composed middleware first (Phase 3: Middleware Composition)
      if (isComposedMiddleware(middlewareItem)) {
        return this.createComposedMiddlewareHandler(middlewareItem);
      }

      // Handle conditional middleware
      if (isConditionalMiddleware(middlewareItem)) {
        return this.createConditionalMiddlewareHandler(middlewareItem);
      }

      // Handle class constructors (Phase 2: Class Reference Support)
      if (this.isMiddlewareClass(middlewareItem)) {
        return this.createLazyMiddlewareHandler(middlewareItem);
      }

      if (this.isExpressoMiddleware(middlewareItem)) {
        return (req: Request, res: Response, next: NextFunction): void => {
          middlewareItem.use(req, res, next);
        };
      }

      if (!this._container.isBound(middlewareItem)) {
        return middlewareItem as express.RequestHandler;
      }

      type MiddlewareInstance = RequestHandler | BaseMiddleware;
      const middlewareInstance = this._container.get<MiddlewareInstance>(middlewareItem);

      if (middlewareInstance instanceof BaseMiddleware) {
        return (req: Request, res: Response, next: NextFunction): void => {
          const mReq = this._container.get<BaseMiddleware>(middlewareItem);
          mReq.httpContext = this._getHttpContext(req);
          mReq.handler(req, res, next);
        };
      }

      return middlewareInstance;
    });
  }

  /**
   * Creates a lazy middleware handler for class constructors.
   * Supports both container-bound middleware (via @provide()) and direct instantiation.
   *
   * Performance: Instances are created per-request to support request-scoped state.
   * For better performance with stateless middleware, use container-bound middleware
   * with proper scoping (singleton/request scope) via @provide().
   *
   * Note: If container resolution fails (e.g., base class missing @injectable()),
   * falls back to direct instantiation for backward compatibility.
   */
  private createLazyMiddlewareHandler(
    MiddlewareClass: new () => IExpressoMiddleware,
  ): express.RequestHandler {
    // Pre-check if container-bound at route registration time (performance optimization)
    const isContainerBound = this._container.isBound(MiddlewareClass);
    let containerResolutionFailed = false;

    // Cache instance for non-container-bound middleware (singleton per handler)
    // Container-bound middleware relies on container scoping (singleton/request scope)
    let cachedInstance: IExpressoMiddleware | undefined;

    return (req: Request, res: Response, next: NextFunction): void | Promise<void> => {
      try {
        let instance: IExpressoMiddleware;

        // Try container resolution first if bound and not previously failed
        if (isContainerBound && !containerResolutionFailed) {
          try {
            // Resolve from container (supports DI, scoping, etc.)
            // Container handles singleton/request scope automatically
            instance = this._container.get<IExpressoMiddleware>(MiddlewareClass);
          } catch (containerError) {
            // Container resolution failed (e.g., base class missing @injectable())
            // Mark as failed and fall back to direct instantiation
            containerResolutionFailed = true;
            try {
              // Create and cache instance if not already cached
              if (!cachedInstance) {
                cachedInstance = new MiddlewareClass();
              }
              instance = cachedInstance;
            } catch (instantiationError) {
              next(instantiationError);
              return;
            }
          }
        } else {
          // Create instance directly (no DI support or container not available)
          // Cache instance for reuse across requests (singleton per handler)
          if (!cachedInstance) {
            try {
              cachedInstance = new MiddlewareClass();
            } catch (instantiationError) {
              next(instantiationError);
              return;
            }
          }
          instance = cachedInstance;
        }

        // Execute middleware (supports both sync and async)
        // The middleware's use() method should call next() itself
        // We pass the next function directly - when middleware calls next(),
        // it will continue the Express middleware chain (or the composition chain)
        try {
          const result = instance.use(req, res, next);

          // Handle async middleware that returns a Promise
          // If it returns a Promise, return it so the chain can await it
          if (result !== undefined && result !== null) {
            const resultObj = result as unknown as { then?: unknown; catch?: unknown };
            if (
              typeof resultObj === "object" &&
              resultObj !== null &&
              "then" in resultObj &&
              typeof resultObj.then === "function"
            ) {
              // Return the Promise so the chain can await it
              // The middleware should have already called next(), but the chain
              // will wait for the Promise to resolve/reject
              return (result as unknown as Promise<void>).catch((error) => {
                // If the Promise rejects and next() wasn't called with error, call it now
                next(error);
              });
            }
          }
          // Synchronous middleware - returns void, chain relies on next() being called
        } catch (useError) {
          // If use() throws synchronously, pass error to next()
          next(useError);
        }
      } catch (error) {
        // Catch any other errors
        next(error);
      }
    };
  }

  /**
   * Creates a request handler for conditional middleware.
   * Evaluates the condition and executes the wrapped middleware if condition is true.
   */
  private createConditionalMiddlewareHandler(
    config: ConditionalMiddlewareConfig,
  ): express.RequestHandler {
    // Resolve the wrapped middleware once (at route registration time)
    const wrappedMiddlewareHandlers = this.resolveMiddleware(config.middleware);

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Evaluate the condition (supports both sync and async)
        const conditionResult = await config.condition(req);

        // Determine if middleware should execute based on condition and skipOnFalse flag
        const shouldExecute = config.skipOnFalse !== false ? conditionResult : !conditionResult;

        if (shouldExecute) {
          // Condition met, execute the wrapped middleware
          // The wrapped middleware handlers are already Express RequestHandlers,
          // so we can execute them directly. They will call next() when done,
          // which will continue to the next middleware in the route.
          if (wrappedMiddlewareHandlers.length === 0) {
            // No middleware to execute, just continue
            next();
          } else if (wrappedMiddlewareHandlers.length === 1) {
            // Single middleware, execute it directly
            wrappedMiddlewareHandlers[0](req, res, next);
          } else {
            // Multiple middleware, execute them sequentially
            await this.executeMiddlewareChain(wrappedMiddlewareHandlers, req, res, next);
          }
        } else {
          // Condition not met, skip middleware and continue to next middleware in route
          next();
        }
      } catch (error) {
        // If condition evaluation throws, pass error to error handler
        next(error);
      }
    };
  }

  /**
   * Creates a request handler for composed middleware (Phase 3: Middleware Composition).
   * Executes all middleware in the composition sequentially.
   * Both 'combine' and 'sequence' types behave the same way - they execute middleware
   * sequentially and propagate errors normally (Express handles errors via next(error)).
   *
   * @param config - ComposedMiddlewareConfig containing the middleware array and type
   * @returns Express RequestHandler
   */
  private createComposedMiddlewareHandler(
    config: ComposedMiddlewareConfig,
  ): express.RequestHandler {
    // Resolve all middleware in the composition to Express RequestHandlers
    const resolvedHandlers = config.middleware.flatMap((mw) => this.resolveMiddleware(mw));

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (resolvedHandlers.length === 0) {
          // No middleware to execute, just continue
          next();
          return;
        }

        // Execute all middleware sequentially
        // Both 'combine' and 'sequence' use the same execution logic
        // Express's error handling (via next(error)) naturally stops execution
        await this.executeMiddlewareChain(resolvedHandlers, req, res, next);
      } catch (error) {
        // If execution throws an error, pass it to Express error handler
        next(error);
      }
    };
  }

  /**
   * Executes a chain of middleware handlers sequentially.
   * Each middleware calls next() to proceed to the next one.
   * Handles both synchronous and asynchronous middleware.
   */
  private executeMiddlewareChain(
    handlers: Array<express.RequestHandler>,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let index = 0;

      const runNext = (err?: unknown): void => {
        if (err) {
          reject(err);
          return;
        }

        if (index >= handlers.length) {
          // All middleware executed successfully, call Express next() to continue to route handler
          next();
          resolve();
          return;
        }

        const handler = handlers[index++];

        try {
          // Execute the handler
          // Express middleware handlers can:
          // 1. Call next() synchronously
          // 2. Call next() asynchronously
          // 3. Return a Promise
          // 4. Return nothing (void)
          const result = handler(req, res, (err?: unknown) => {
            if (err) {
              reject(err);
            } else {
              // Handler called next() successfully, proceed to next middleware
              runNext();
            }
          });

          // If handler returns a Promise, wait for it
          // Note: Even if handler returns a Promise, it should still call next()
          // But we handle the Promise in case it doesn't
          // Check if result exists and is a Promise-like object (thenable)
          if (result !== undefined && result !== null) {
            const resultObj = result as unknown as { then?: unknown };
            if (
              typeof resultObj === "object" &&
              resultObj !== null &&
              "then" in resultObj &&
              typeof resultObj.then === "function"
            ) {
              (result as unknown as Promise<unknown>)
                .then(() => {
                  // If Promise resolves and next wasn't called, proceed
                  if (index <= handlers.length) {
                    runNext();
                  }
                })
                .catch(reject);
            }
          }
          // If handler doesn't return a Promise and doesn't call next(),
          // we rely on the handler to call next() itself
        } catch (error) {
          reject(error);
        }
      };

      runNext();
    });
  }

  private copyHeadersTo(headers: OutgoingHttpHeaders, target: Response): void {
    for (const name of Object.keys(headers)) {
      const headerValue = headers[name];

      target.append(name, typeof headerValue === "number" ? headerValue.toString() : headerValue);
    }
  }

  private async handleHttpResponseMessage(
    message: HttpResponseMessage,
    res: express.Response,
  ): Promise<void> {
    this.copyHeadersTo(message.headers, res);

    if (message.content !== undefined) {
      this.copyHeadersTo(message.content.headers, res);

      res
        .status(message.statusCode)
        // If the content is a number, ensure we change it to a string, else our content is
        // treated as a statusCode rather than as the content of the Response
        .send(await message.content.readAsync());
    } else {
      res.sendStatus(message.statusCode);
    }
  }

  private handlerFactory(
    controllerName: string,
    key: string,
    parameterMetadata: Array<ParameterMetadata>,
    controllerConstructor?: NewableFunction,
    methodMetadata?: ControllerMethodMetadata,
  ): RequestHandler {
    // Extract guards from controller and method metadata
    const controllerGuards = controllerConstructor
      ? getControllerGuards(controllerConstructor)
      : [];
    const methodGuards = controllerConstructor ? getMethodGuards(controllerConstructor, key) : [];
    const allGuards = [...controllerGuards, ...methodGuards];

    // Create guard middleware if guards exist
    let guardMiddleware: RequestHandler | null = null;
    if (allGuards.length > 0) {
      try {
        // Check if guard system is initialized (use class identifiers, not strings)
        if (
          this._container.isBound(GuardExecutor) &&
          this._container.isBound(GuardContextFactory) &&
          this._container.isBound(GuardMiddleware)
        ) {
          const guardMiddlewareInstance = this._container.get<{ execute: RequestHandler }>(
            GuardMiddleware,
          );
          guardMiddleware = guardMiddlewareInstance.execute;
        }
      } catch (error) {
        // Guard system not initialized, continue without guards
        console.error("[Guard System] Failed to initialize:", error);
      }
    }

    // Create handler function
    const handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Attach controller and method metadata to request for exception handler middleware
        // This provides a reliable fallback if route stack extraction fails
        if (controllerConstructor) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (req as any).__expressotsController = controllerConstructor;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (req as any).__expressotsMethod = key;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (req as any).__expressotsControllerName = controllerName;

          // Attach guards to request for guard middleware
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (req as any).__expressotsControllerGuards = controllerGuards;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (req as any).__expressotsMethodGuards = methodGuards;
        }

        // Execute guard middleware if guards exist
        if (guardMiddleware && allGuards.length > 0) {
          // Express 5 typings expect the handler to return `void`. We cannot
          // `return` the call because the express handler signature is
          // `(req, res, next) => void | Promise<void>` in v5; chaining the
          // expression off `return` makes TS infer `unknown`. Invoke it
          // for-effect and return.
          guardMiddleware(req, res, async (err?: unknown) => {
            if (err) {
              next(err);
              return;
            }
            // Guards passed, continue to route handler
            await this.executeRouteHandler(
              req,
              res,
              next,
              controllerName,
              key,
              parameterMetadata,
              controllerConstructor,
            );
          });
          return;
        }

        // No guards, execute route handler directly
        await this.executeRouteHandler(
          req,
          res,
          next,
          controllerName,
          key,
          parameterMetadata,
          controllerConstructor,
        );
      } catch (error) {
        next(error);
      }
    };

    return handler;
  }

  private async executeRouteHandler(
    req: Request,
    res: Response,
    next: NextFunction,
    controllerName: string,
    key: string,
    parameterMetadata: Array<ParameterMetadata>,
    controllerConstructor?: NewableFunction,
  ): Promise<void> {
    // Get request ID for flow tracking
    const requestContext = ContextManager.getCurrentContext();
    const requestId = requestContext?.requestId;
    const flowTracker = requestId ? findFlowTracker(requestId) : undefined;
    const controllerStepName = `${controllerName}.${key}`;

    try {
      let args = this.extractParameters(req, res, next, parameterMetadata);
      const httpContext = this._getHttpContext(req);
      httpContext.container.bind<HttpContext>(TYPE.HttpContext).toConstantValue(httpContext);

      // Validate parameters if validation service is enabled
      const validationService = this.getValidationService();
      if (validationService?.isEnabled() && controllerConstructor) {
        // Check if there are actually validation metadata (has @validatedBody, @validatedQuery, etc.)
        const validationMetadata = getValidationMetadata(controllerConstructor, key);
        const hasValidatedParams = validationMetadata.length > 0;

        if (hasValidatedParams) {
          // Start validation step only if there are validated parameters
          if (flowTracker?.isEnabled()) {
            flowTracker.startStep("validation", `Validation: ${controllerName}.${key}`);
          }

          const validatedArgs = await validationService.validateParameters(
            req,
            res,
            controllerConstructor,
            key,
            args as Array<unknown>,
          );

          if (validatedArgs === null) {
            // Validation failed, response already sent
            // Create a validation error to store on request
            const validationError = new Error("Validation failed");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any).__expressotsFlowError = validationError;

            if (flowTracker?.isEnabled()) {
              flowTracker.failStep(validationError);
            }
            return;
          }

          // End validation step
          if (flowTracker?.isEnabled()) {
            flowTracker.endStep("success");
          }

          args = validatedArgs as ExtractedParameters;
        } else {
          // No validation metadata, but validation service might still run smart detection
          // Only track if smart detection actually finds something to validate
          const validatedArgs = await validationService.validateParameters(
            req,
            res,
            controllerConstructor,
            key,
            args as Array<unknown>,
          );

          if (validatedArgs === null) {
            // Smart detection found validation errors
            return;
          }

          args = validatedArgs as ExtractedParameters;
        }
      }

      // Start controller step
      if (flowTracker?.isEnabled()) {
        flowTracker.startStep("controller", controllerStepName, {
          controller: controllerName,
          method: key,
        });
      }

      // invoke controller's action
      const controller = httpContext.container.getNamed<BaseController>(
        TYPE.Controller,
        controllerName,
      );
      const value = await (controller[key] as ControllerHandler)(...args);

      // End controller step
      if (flowTracker?.isEnabled()) {
        flowTracker.endStep("success");
      }

      const { template, defaultData } = getRenderMetadata(controller, key);

      if (template) {
        const data = value || defaultData || {};
        res.render(template, data as Record<string, unknown>);
      } else if (value instanceof HttpResponseMessage) {
        await this.handleHttpResponseMessage(value, res);
      } else if (instanceOfIHttpActionResult(value)) {
        const httpResponseMessage = await value.executeAsync();
        await this.handleHttpResponseMessage(httpResponseMessage, res);
      } else if (value instanceof Function) {
        value();
      } else if (!res.headersSent) {
        // Smart response handling: Auto-404 for GET requests returning null/undefined
        // This is a common pattern where null means "resource not found"
        if (value === null || value === undefined) {
          const method = req.method.toUpperCase();

          // For GET requests, null/undefined typically means "not found"
          // For DELETE requests, undefined means "successfully deleted" (204 No Content is already set)
          if (method === "GET") {
            // Extract resource info from path for helpful error message
            const pathParts = req.path.split("/").filter(Boolean);
            const resource = pathParts[pathParts.length - 2] || "Resource";
            // Express 5's path-to-regexp v8 widens param values to
            // `string | string[]` because array-style params are now first
            // class. Coerce to string for the NotFoundError signature.
            const rawId = req.params?.id ?? pathParts[pathParts.length - 1];
            const id = Array.isArray(rawId) ? rawId.join("/") : rawId;

            throw new NotFoundError(resource, id);
          }

          // For other methods (DELETE, PUT, PATCH), undefined is valid (204 No Content)
          // The HttpStatusCodeMiddleware already sets appropriate status codes
          if (method !== "DELETE" && method !== "PUT" && method !== "PATCH") {
            // For POST or other methods with null/undefined, send empty response
            res.end();
          }
          // For DELETE/PUT/PATCH, the middleware already set 204, just end the response
          else {
            res.end();
          }
        } else {
          // Try content negotiation if enabled
          const cnMetadata = getContentNegotiationMetadata(controller, key);
          const contentNegotiationService = this.getContentNegotiationService();

          if (contentNegotiationService?.isEnabled()) {
            const handled = await contentNegotiationService.handleResponse(
              req,
              res,
              value,
              cnMetadata.accept || cnMetadata.produces,
            );

            if (handled) {
              return; // Response already sent
            }
          }

          // Fallback to default behavior (backward compatible)
          res.send(value);
        }
      }
    } catch (err) {
      // Store error on request for flow tracking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).__expressotsFlowError = err instanceof Error ? err : new Error(String(err));

      // End controller step with failure if not already ended
      if (flowTracker?.isEnabled()) {
        const currentFlow = flowTracker.getFlow();
        const lastStep = currentFlow.steps[currentFlow.steps.length - 1];
        if (lastStep && lastStep.name === controllerStepName && lastStep.status === "success") {
          // Step was already ended, don't end again
        } else {
          flowTracker.failStep(err instanceof Error ? err : undefined);
        }
      }
      next(err);
    }
  }

  private _getHttpContext(req: express.Request): HttpContext {
    return getHttpContext(req) as HttpContext;
  }

  /**
   * Sets the content negotiation service instance.
   * @param service - Content negotiation service instance
   */
  public setContentNegotiationService(service: ContentNegotiationService): void {
    this._contentNegotiationService = service;
  }

  /**
   * Gets the content negotiation service if available.
   * @returns Content negotiation service or undefined
   */
  private getContentNegotiationService(): ContentNegotiationService | undefined {
    return this._contentNegotiationService;
  }

  /**
   * Sets the validation service instance.
   * @param service - Validation service instance
   */
  public setValidationService(service: ValidationService): void {
    this._validationService = service;
  }

  /**
   * Gets the validation service if available.
   * @returns Validation service or undefined
   */
  private getValidationService(): ValidationService | undefined {
    return this._validationService;
  }

  private async _createHttpContext(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<HttpContext> {
    const principal = await this._getCurrentUser(req, res, next);
    return {
      // We use a childContainer for each request so we can be
      // sure that the binding is unique for each HTTP request
      container: this._container.createChild(),
      request: req,
      response: res,
      user: principal,
    };
  }

  private async _getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Principal> {
    // Check if AuthProvider is available (either via constructor or bound via setupAuthorizationForExpress)
    if (this._AuthProvider !== undefined || this._container.isBound(TYPE.AuthProvider)) {
      const authProvider = this._container.get<AuthProvider>(TYPE.AuthProvider);
      return authProvider.getUser(req, res, next);
    }
    return Promise.resolve<Principal>({
      details: null,
      isAuthenticated: () => Promise.resolve(false),
      isInRole: (_role: string) => Promise.resolve(false),
      isResourceOwner: (_resourceId: unknown) => Promise.resolve(false),
    });
  }

  private extractParameters(
    req: Request,
    res: Response,
    next: NextFunction,
    params: Array<ParameterMetadata>,
  ): ExtractedParameters {
    const args: Array<unknown> = [];
    if (!params || !params.length) {
      return [req, res, next];
    }

    params.forEach(({ type, index, parameterName, injectRoot }) => {
      switch (type) {
        case PARAMETER_TYPE.REQUEST:
          args[index] = req;
          break;
        case PARAMETER_TYPE.NEXT:
          args[index] = next;
          break;
        case PARAMETER_TYPE.PARAMS:
          args[index] = this.getParam(req, "params", injectRoot, parameterName);
          break;
        case PARAMETER_TYPE.QUERY:
          args[index] = this.getParam(req, "query", injectRoot, parameterName);
          break;
        case PARAMETER_TYPE.BODY:
          args[index] = req.body;
          break;
        case PARAMETER_TYPE.HEADERS:
          args[index] = this.getParam(req, "headers", injectRoot, parameterName);
          break;
        case PARAMETER_TYPE.COOKIES:
          args[index] = this.getParam(req, "cookies", injectRoot, parameterName);
          break;
        case PARAMETER_TYPE.PRINCIPAL:
          args[index] = this._getPrincipal(req);
          break;
        default:
          args[index] = res;
          break; // response
      }
    });

    args.push(req, res, next);
    return args;
  }

  private getParam(
    source: Request,
    paramType: "params" | "query" | "headers" | "cookies",
    injectRoot: boolean,
    name?: string,
  ): Record<string, unknown> | unknown | undefined {
    const key = paramType === "headers" ? name?.toLowerCase() : name;
    const param = source[paramType] as Record<string, unknown>;

    if (injectRoot) {
      return param;
    }

    return param && key ? param[key] : undefined;
  }

  private _getPrincipal(req: express.Request): Principal | null {
    return this._getHttpContext(req).user;
  }
}
