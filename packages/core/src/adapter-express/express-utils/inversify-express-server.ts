/* eslint-disable @typescript-eslint/no-unused-vars */
import express, {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import { interfaces } from "inversify";
import { BaseMiddleware } from "./base-middleware";
import {
  getControllersFromMetadata,
  getControllersFromContainer,
  getControllerMetadata,
  getControllerMethodMetadata,
  getControllerParameterMetadata,
  instanceOfIHttpActionResult,
} from "./utils";
import {
  TYPE,
  METADATA_KEY,
  DEFAULT_ROUTING_ROOT_PATH,
  PARAMETER_TYPE,
  DUPLICATED_CONTROLLER_NAME,
} from "./constants";
import { HttpResponseMessage } from "./httpResponseMessage";

import type {
  AuthProvider,
  BaseController,
  ConfigFunction,
  ControllerHandler,
  ControllerMethodMetadata,
  ExtractedParameters,
  HttpContext,
  Middleware,
  ParameterMetadata,
  Principal,
  RoutingConfig,
} from "./interfaces";
import type { OutgoingHttpHeaders } from "node:http";

export class InversifyExpressServer {
  private _router: Router;
  private _container: interfaces.Container;
  private _app: Application;
  private _configFn!: ConfigFunction;
  private _errorConfigFn!: ConfigFunction;
  private _routingConfig: RoutingConfig;
  private _AuthProvider!: new () => AuthProvider;
  private _forceControllers: boolean;

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
    // The very first middleware to be invoked
    // it creates a new httpContext and attaches it to the
    // current request as metadata using Reflect
    this._app.all("*", (req: Request, res: Response, next: NextFunction) => {
      void (async (): Promise<void> => {
        const httpContext = await this._createHttpContext(req, res, next);
        Reflect.defineMetadata(METADATA_KEY.httpContext, httpContext, req);
        next();
      })();
    });

    // register server-level middleware before anything else
    if (this._configFn) {
      this._configFn.apply(undefined, [this._app]);
    }

    this.registerControllers();

    // register error handlers after controllers
    if (this._errorConfigFn) {
      this._errorConfigFn.apply(undefined, [this._app]);
    }

    return this._app;
  }

  private registerControllers(): void {
    // Fake HttpContext is needed during registration
    this._container
      .bind<HttpContext>(TYPE.HttpContext)
      .toConstantValue({} as HttpContext);

    const constructors = getControllersFromMetadata();

    constructors.forEach((constructor) => {
      const { name } = constructor as { name: string };

      if (this._container.isBoundNamed(TYPE.Controller, name)) {
        throw new Error(DUPLICATED_CONTROLLER_NAME(name));
      }

      this._container
        .bind(TYPE.Controller)
        .to(constructor as new (...args: Array<never>) => unknown)
        .whenTargetNamed(name);
    });

    const controllers = getControllersFromContainer(
      this._container,
      this._forceControllers,
    );

    controllers.forEach((controller: BaseController) => {
      const controllerMetadata = getControllerMetadata(controller.constructor);
      const methodMetadata = getControllerMethodMetadata(
        controller.constructor,
      );
      const parameterMetadata = getControllerParameterMetadata(
        controller.constructor,
      );

      if (controllerMetadata && methodMetadata) {
        const controllerMiddleware = this.resolveMidleware(
          ...controllerMetadata.middleware,
        );

        methodMetadata.forEach((metadata: ControllerMethodMetadata) => {
          let paramList: Array<ParameterMetadata> = [];
          if (parameterMetadata) {
            paramList = parameterMetadata[metadata.key] || [];
          }
          const handler: express.RequestHandler = this.handlerFactory(
            (controllerMetadata.target as { name: string }).name,
            metadata.key,
            paramList,
          );
          const routeMiddleware = this.resolveMidleware(...metadata.middleware);
          this._router[metadata.method](
            `${controllerMetadata.path}${metadata.path}`,
            ...controllerMiddleware,
            ...routeMiddleware,
            handler,
          );
        });
      }
    });

    this._app.use(this._routingConfig.rootPath, this._router);
  }

  private resolveMidleware(
    ...middleware: Array<Middleware>
  ): Array<express.RequestHandler> {
    return middleware.map((middlewareItem) => {
      if (!this._container.isBound(middlewareItem)) {
        return middlewareItem as express.RequestHandler;
      }

      type MiddlewareInstance = RequestHandler | BaseMiddleware;
      const middlewareInstance =
        this._container.get<MiddlewareInstance>(middlewareItem);

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

  private copyHeadersTo(headers: OutgoingHttpHeaders, target: Response): void {
    for (const name of Object.keys(headers)) {
      const headerValue = headers[name];

      target.append(
        name,
        typeof headerValue === "number" ? headerValue.toString() : headerValue,
      );
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
  ): express.RequestHandler {
    return async (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        const args = this.extractParameters(req, res, next, parameterMetadata);
        const httpContext = this._getHttpContext(req);
        httpContext.container
          .bind<HttpContext>(TYPE.HttpContext)
          .toConstantValue(httpContext);

        // invoke controller's action
        const value = await (
          httpContext.container.getNamed<BaseController>(
            TYPE.Controller,
            controllerName,
          )[key] as ControllerHandler
        )(...args);

        if (value instanceof HttpResponseMessage) {
          await this.handleHttpResponseMessage(value, res);
        } else if (instanceOfIHttpActionResult(value)) {
          const httpResponseMessage = await value.executeAsync();
          await this.handleHttpResponseMessage(httpResponseMessage, res);
        } else if (value instanceof Function) {
          value();
        } else if (!res.headersSent) {
          if (value === undefined) {
            res.status(204);
          }
          res.send(value);
        }
      } catch (err) {
        next(err);
      }
    };
  }

  private _getHttpContext(req: express.Request): HttpContext {
    return Reflect.getMetadata(METADATA_KEY.httpContext, req) as HttpContext;
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
    if (this._AuthProvider !== undefined) {
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
          args[index] = this.getParam(
            req,
            "headers",
            injectRoot,
            parameterName,
          );
          break;
        case PARAMETER_TYPE.COOKIES:
          args[index] = this.getParam(
            req,
            "cookies",
            injectRoot,
            parameterName,
          );
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
