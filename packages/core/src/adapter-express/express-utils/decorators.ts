import "reflect-metadata";
import { inject, injectable, decorate } from "inversify";
import {
  TYPE,
  METADATA_KEY,
  PARAMETER_TYPE,
  HTTP_VERBS_ENUM,
} from "./constants";
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
      (Reflect.getMetadata(
        METADATA_KEY.controller,
        Reflect,
      ) as Array<ControllerMetadata>) || [];

    const newMetadata = [currentMetadata, ...previousMetadata];

    Reflect.defineMetadata(METADATA_KEY.controller, newMetadata, Reflect);
  };
}

export function all(
  path: string,
  ...middleware: Array<Middleware>
): HandlerDecorator {
  return httpMethod("all", path, ...middleware);
}

export function Get(
  path: string,
  ...middleware: Array<Middleware>
): HandlerDecorator {
  return httpMethod("get", path, ...middleware);
}

export function Post(
  path: string,
  ...middleware: Array<Middleware>
): HandlerDecorator {
  return httpMethod("post", path, ...middleware);
}

export function Put(
  path: string,
  ...middleware: Array<Middleware>
): HandlerDecorator {
  return httpMethod("put", path, ...middleware);
}

export function Patch(
  path: string,
  ...middleware: Array<Middleware>
): HandlerDecorator {
  return httpMethod("patch", path, ...middleware);
}

export function Head(
  path: string,
  ...middleware: Array<Middleware>
): HandlerDecorator {
  return httpMethod("head", path, ...middleware);
}

export function Delete(
  path: string,
  ...middleware: Array<Middleware>
): HandlerDecorator {
  return httpMethod("delete", path, ...middleware);
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

    if (
      !Reflect.hasOwnMetadata(METADATA_KEY.controllerMethod, target.constructor)
    ) {
      Reflect.defineMetadata(
        METADATA_KEY.controllerMethod,
        metadataList,
        target.constructor,
      );
    } else {
      metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as Array<ControllerMethodMetadata>;
    }

    metadataList.push(metadata);
  };
}

/*
 * Parameter Decorators
 */
export const request: () => ParameterDecorator = paramDecoratorFactory(
  PARAMETER_TYPE.REQUEST,
);

export const response: () => ParameterDecorator = paramDecoratorFactory(
  PARAMETER_TYPE.RESPONSE,
);

export const param: (paramName?: string) => ParameterDecorator =
  paramDecoratorFactory(PARAMETER_TYPE.PARAMS);

export const query: (queryParamName?: string) => ParameterDecorator =
  paramDecoratorFactory(PARAMETER_TYPE.QUERY);

export const body: () => ParameterDecorator = paramDecoratorFactory(
  PARAMETER_TYPE.BODY,
);

export const headers: (headerName?: string) => ParameterDecorator =
  paramDecoratorFactory(PARAMETER_TYPE.HEADERS);

export const cookies: (cookieName?: string) => ParameterDecorator =
  paramDecoratorFactory(PARAMETER_TYPE.COOKIES);

export const next: () => ParameterDecorator = paramDecoratorFactory(
  PARAMETER_TYPE.NEXT,
);

export const Principal: () => ParameterDecorator = paramDecoratorFactory(
  PARAMETER_TYPE.PRINCIPAL,
);

function paramDecoratorFactory(
  parameterType: PARAMETER_TYPE,
): (name?: string) => ParameterDecorator {
  return (name?: string): ParameterDecorator => params(parameterType, name);
}

export function params(type: PARAMETER_TYPE, parameterName?: string) {
  return (
    target: unknown | Controller,
    methodName: string | symbol,
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
      !Reflect.hasOwnMetadata(
        METADATA_KEY.controllerParameter,
        (target as Controller).constructor,
      )
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
