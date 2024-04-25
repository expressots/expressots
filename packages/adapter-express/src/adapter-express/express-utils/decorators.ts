import "reflect-metadata";

import { inject, injectable, decorate } from "inversify";
import { TYPE, METADATA_KEY, PARAMETER_TYPE, HTTP_VERBS_ENUM } from "./constants";
import type {
  Controller,
  ControllerMetadata,
  ControllerMethodMetadata,
  ControllerParameterMetadata,
  DecoratorTarget,
  HandlerDecorator,
  Middleware,
  ParameterMetadata,
} from "./interfaces";

export const injectHttpContext = inject(TYPE.HttpContext);

/**
 * Controller decorator to define a new controller
 * @param path route path
 * @param middleware array of middleware to be applied to all routes in the controller
 */
export function controller(path: string, ...middleware: Array<Middleware>) {
  return (target: NewableFunction): void => {
    const currentMetadata: ControllerMetadata = {
      middleware,
      path,
      target,
    };

    decorate(injectable(), target);
    Reflect.defineMetadata(METADATA_KEY.controller, currentMetadata, target);

    const previousMetadata: Array<ControllerMetadata> =
      (Reflect.getMetadata(METADATA_KEY.controller, Reflect) as Array<ControllerMetadata>) || [];

    const newMetadata = [currentMetadata, ...previousMetadata];

    Reflect.defineMetadata(METADATA_KEY.controller, newMetadata, Reflect);
  };
}

/**
 * Decorator to allow accept all HTTP methods
 * @param path route path, wildcard
 * @param middleware array of middleware to be applied to all routes defined in path logic
 */
export function All(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return httpMethod("all", path, ...middleware);
}

/**
 * Decorator to allow GET HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 */
export function Get(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return enhancedHttpMethod("get", path, ...middleware);
}

/**
 * Decorator to allow POST HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 */
export function Post(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return httpMethod("post", path, ...middleware);
}

/**
 * Decorator to allow PUT HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 */
export function Put(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return enhancedHttpMethod("put", path, ...middleware);
}

/**
 * Decorator to allow PATCH HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 */
export function Patch(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return enhancedHttpMethod("patch", path, ...middleware);
}

/**
 * Decorator to allow HEAD HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 */
export function Head(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return httpMethod("head", path, ...middleware);
}

/**
 * Decorator to allow DELETE HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 */
export function Delete(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return enhancedHttpMethod("delete", path, ...middleware);
}

function enhancedHttpMethod(
  method: keyof typeof HTTP_VERBS_ENUM,
  path: string,
  ...middleware: Array<Middleware>
): HandlerDecorator {
  return (target: DecoratorTarget, key: string): void => {
    const metadata: ControllerMethodMetadata = {
      key,
      method,
      middleware,
      path,
      target,
    };
    let metadataList: Array<ControllerMethodMetadata> = [];

    if (!Reflect.hasOwnMetadata(METADATA_KEY.controllerMethod, target.constructor)) {
      Reflect.defineMetadata(METADATA_KEY.controllerMethod, metadataList, target.constructor);
    } else {
      metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as Array<ControllerMethodMetadata>;
    }
    metadataList.push(metadata);

    const paramsInfo: Array<unknown> = Reflect.getMetadata("design:paramtypes", target, key) || [];
    metadataList.forEach((m) => {
      m.middleware.unshift((req, res, next) => {
        req.params &&
          Object.keys(req.params).forEach((param, idx) => {
            const type = paramsInfo[idx];
            req.params[param] = convertToType(req.params[param], type) as string;
          });
        next();
      });
    });
  };
}

export function httpMethod(
  method: keyof typeof HTTP_VERBS_ENUM,
  path: string,
  ...middleware: Array<Middleware>
): HandlerDecorator {
  return (target: DecoratorTarget, key: string): void => {
    const metadata: ControllerMethodMetadata = {
      key,
      method,
      middleware,
      path,
      target,
    };

    let metadataList: Array<ControllerMethodMetadata> = [];

    if (!Reflect.hasOwnMetadata(METADATA_KEY.controllerMethod, target.constructor)) {
      Reflect.defineMetadata(METADATA_KEY.controllerMethod, metadataList, target.constructor);
    } else {
      metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as Array<ControllerMethodMetadata>;
    }

    metadataList.push(metadata);
  };
}

/**
 * Parameter decorator to inject the request object
 * @returns ParameterDecorator
 */
export const request: () => ParameterDecorator = paramDecoratorFactory(PARAMETER_TYPE.REQUEST);

/**
 * Parameter decorator to inject the response object
 * @returns ParameterDecorator
 */
export const response: () => ParameterDecorator = paramDecoratorFactory(PARAMETER_TYPE.RESPONSE);

/**
 * Parameter decorator to inject parameters from the route
 * @returns ParameterDecorator
 */
export const param: (paramName?: string) => ParameterDecorator = paramDecoratorFactory(
  PARAMETER_TYPE.PARAMS,
);

/**
 * Parameter decorator to inject query parameters
 * @returns ParameterDecorator
 */
export const query: (queryParamName?: string) => ParameterDecorator = paramDecoratorFactory(
  PARAMETER_TYPE.QUERY,
);

/**
 * Parameter decorator to inject the request body
 * @returns ParameterDecorator
 */
export const body: () => ParameterDecorator = paramDecoratorFactory(PARAMETER_TYPE.BODY);

/**
 * Parameter decorator to inject the request headers
 * @returns ParameterDecorator
 */
export const headers: (headerName?: string) => ParameterDecorator = paramDecoratorFactory(
  PARAMETER_TYPE.HEADERS,
);

/**
 * Parameter decorator to inject the request cookies
 * @returns ParameterDecorator
 */
export const cookies: (cookieName?: string) => ParameterDecorator = paramDecoratorFactory(
  PARAMETER_TYPE.COOKIES,
);

/**
 * Parameter decorator next function
 * @returns ParameterDecorator
 */
export const next: () => ParameterDecorator = paramDecoratorFactory(PARAMETER_TYPE.NEXT);

/**
 * Parameter decorator to inject the principal object obtained from AuthProvider
 * @returns ParameterDecorator
 */
export const principal: () => ParameterDecorator = paramDecoratorFactory(PARAMETER_TYPE.PRINCIPAL);

function paramDecoratorFactory(
  parameterType: PARAMETER_TYPE,
): (name?: string) => ParameterDecorator {
  return (name?: string): ParameterDecorator => params(parameterType, name);
}

export function params(type: PARAMETER_TYPE, parameterName?: string): ParameterDecorator {
  return (
    target: unknown | Controller,
    methodName: string | symbol | undefined,
    index: number,
  ): void => {
    let metadataList: ControllerParameterMetadata = {};
    let parameterMetadataList: Array<ParameterMetadata> = [];
    const parameterMetadata: ParameterMetadata = {
      index,
      injectRoot: parameterName === undefined,
      parameterName,
      type,
    };
    if (
      !Reflect.hasOwnMetadata(METADATA_KEY.controllerParameter, (target as Controller).constructor)
    ) {
      parameterMetadataList.unshift(parameterMetadata);
    } else {
      metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerParameter,
        (target as Controller).constructor,
      ) as ControllerParameterMetadata;
      if (metadataList[methodName as string]) {
        parameterMetadataList = metadataList[methodName as string] || [];
      }
      parameterMetadataList.unshift(parameterMetadata);
    }
    metadataList[methodName as string] = parameterMetadataList;
    Reflect.defineMetadata(
      METADATA_KEY.controllerParameter,
      metadataList,
      (target as Controller).constructor,
    );
  };
}

function convertToType(value: string, type: unknown): string | number | boolean {
  if (type === Number) {
    return Number(value);
  } else if (type === String) {
    return value;
  } else if (type === Boolean) {
    return value === "true" || value === "1";
  }
  return value;
}
