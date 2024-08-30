import "reflect-metadata";

import { inject, injectable, decorate } from "inversify";
import {
  TYPE,
  METADATA_KEY,
  PARAMETER_TYPE,
  HTTP_VERBS_ENUM,
  HTTP_CODE_METADATA,
  RENDER_METADATA_KEY,
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
import { packageResolver } from "./resolver-multer";
import { RequestHandler, Request, Response } from "express";
import { Report, StatusCode } from "@expressots/core";

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

    const pathMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.path, Reflect) || {};
    const statusCodeMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.statusCode, Reflect) || {};
    const statusCodePathMapping =
      Reflect.getOwnMetadata(HTTP_CODE_METADATA.httpCode, Reflect) || {};

    for (const key in pathMetadata) {
      if (statusCodeMetadata && statusCodeMetadata[key]) {
        const realPath =
          pathMetadata[key]["path"] === "/" ? path : `${path}${pathMetadata[key]["path"]}`;

        statusCodePathMapping[`${realPath}/-${pathMetadata[key]["method"].toLowerCase()}`] =
          statusCodeMetadata[key];
      }
    }

    Reflect.defineMetadata(HTTP_CODE_METADATA.httpCode, statusCodePathMapping, Reflect);
    Reflect.deleteMetadata(HTTP_CODE_METADATA.statusCode, Reflect);
    Reflect.deleteMetadata(HTTP_CODE_METADATA.path, Reflect);

    decorate(injectable(), target);
    Reflect.defineMetadata(METADATA_KEY.controller, currentMetadata, target);

    const previousMetadata: Array<ControllerMetadata> =
      (Reflect.getMetadata(METADATA_KEY.controller, Reflect) as Array<ControllerMetadata>) || [];

    const newMetadata = [currentMetadata, ...previousMetadata];

    Reflect.defineMetadata(METADATA_KEY.controller, newMetadata, Reflect);
  };
}

/**
 * Http decorator to define the status code for a route
 * @param code
 * @returns MethodDecorator
 * @example
 * ```ts
 * @Http(200)
 * @Get("/")
 * hello() {
 *  return "Hello World";
 * }
 * ```
 */
export function Http(code: number) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  return (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<any>): void => {
    let httpCodeMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.statusCode, Reflect);

    if (httpCodeMetadata) {
      httpCodeMetadata[key] = code;
    } else {
      httpCodeMetadata = {};
      httpCodeMetadata[key] = code;
    }

    Reflect.defineMetadata(HTTP_CODE_METADATA.statusCode, httpCodeMetadata, Reflect);
  };
}

/**
 * Decorator to allow accept all HTTP methods
 * @param path route path, wildcard
 * @param middleware array of middleware to be applied to all routes defined in path logic
 */
export function All(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return Method("all", path, ...middleware);
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
  return Method("post", path, ...middleware);
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
  return Method("head", path, ...middleware);
}

/**
 * Decorator to allow DELETE HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 */
export function Delete(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return enhancedHttpMethod("delete", path, ...middleware);
}

/**
 * Decorator to allow OPTIONS HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 */
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

    let pathMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.path, Reflect);

    if (pathMetadata) {
      pathMetadata[key] = {
        path,
        method,
      };
    } else {
      pathMetadata = {};
      pathMetadata[key] = {
        path,
        method,
      };
    }

    Reflect.defineMetadata(HTTP_CODE_METADATA.path, pathMetadata, Reflect);

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

/**
 * Decorator to allow custom HTTP method
 * @param method custom HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 */
export function Method(
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

    let pathMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.path, Reflect);

    if (pathMetadata) {
      pathMetadata[key] = {
        path,
        method,
      };
    } else {
      pathMetadata = {};
      pathMetadata[key] = {
        path,
        method,
      };
    }

    Reflect.defineMetadata(HTTP_CODE_METADATA.path, pathMetadata, Reflect);

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

/**
 * Parameter decorator to inject the request user object
 * @returns ParameterDecorator
 */
function paramDecoratorFactory(
  parameterType: PARAMETER_TYPE,
): (name?: string) => ParameterDecorator {
  return (name?: string): ParameterDecorator => params(parameterType, name);
}

/**
 * Parameter decorator to inject the request object
 * @returns ParameterDecorator
 */
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

/**
 * Render decorator to define the template and default data for a route
 * @param template The template to render
 * @param defaultData The default data to pass to the template
 * @returns
 */
export function Render(template: string, defaultData?: Record<string, unknown>): MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void => {
    Reflect.defineMetadata(RENDER_METADATA_KEY, { template, defaultData }, target, propertyKey);
  };
}

export function getRenderMetadata(
  target: object,
  propertyKey: string | symbol,
): {
  template?: string;
  defaultData?: Record<string, unknown>;
} {
  return Reflect.getMetadata(RENDER_METADATA_KEY, target, propertyKey) || {};
}

/**
 * Converts a string value to the specified type.
 * @param value The value to convert.
 * @param type The type to convert the value to.
 * @returns The converted value.
 */
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

export interface StorageEngine {
  _handleFile(
    req: unknown,
    file: MulterFile,
    callback: (error?: Error | null, info?: Partial<MulterFile>) => void,
  ): void;
  _removeFile(req: unknown, file: MulterFile, callback: (error: Error | null) => void): void;
}

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

export interface MulterLimits {
  fieldNameSize?: number;
  fieldSize?: number;
  fields?: number;
  fileSize?: number;
  files?: number;
  parts?: number;
  headerPairs?: number;
}

export interface MulterOptions {
  dest?: string;
  storage?: StorageEngine;
  limits?: MulterLimits;
  fileFilter?: FileFilter;
}

export type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;
export type FileFilter = (req: unknown, file: MulterFile, callback: FileFilterCallback) => void;
type FieldOptions = { fieldName: string; maxCount?: number };

/**
 * File upload decorator to handle file uploads
 * @param options
 * @param multerOptions
 * @default { none: true }
 * @returns MethodDecorator
 */
export function FileUpload(
  options?: FieldOptions | Array<FieldOptions> | { none?: boolean; any?: boolean },
  multerOptions?: MulterOptions,
): MethodDecorator {
  const multer = packageResolver("multer");
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let upload: any;
  let method: "single" | "array" | "fields" | "none" | "any" = "none";
  if (multer) {
    if (options === undefined) {
      options = { none: true };
    }

    upload = multer(multerOptions);
    method = inferMulterMethod(options);
  }

  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    const originalMethod = descriptor.value;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    descriptor.value = function (...args: Array<any>): any {
      const req = args.find((el) => el.url) as Request; // url always exists on request object so it's safe to assume it exists
      const res = args.find((el) => el.json) as Response; // same case for res.json, it always exists, so it's safe to assume it exists
      // const next = args[2] as NextFunction;

      const multerMiddleware: RequestHandler = getMulterMiddleware(upload, options, method);
      multerMiddleware(req, res, (err: any) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        return originalMethod.apply(this, args);
      });
    };
  };
}

/**
 * Infer the multer method to use based on the provided options
 * @param options
 * @returns
 */
function inferMulterMethod(
  options?: FieldOptions | Array<FieldOptions> | { none?: boolean; any?: boolean },
): "single" | "array" | "fields" | "none" | "any" {
  const report: Report = new Report();

  if ((options as { none?: boolean }).none) return "none";
  if ((options as { any?: boolean }).any) return "any";
  if (Array.isArray(options)) return "fields";
  if ((options as FieldOptions).fieldName && (options as FieldOptions).maxCount !== undefined)
    return "array";
  if ((options as FieldOptions).fieldName) return "single";

  throw report.error(
    "Invalid options provided for FileUpload.",
    StatusCode.InternalServerError,
    "multer-decorator",
  );
}

/**
 * Get the multer middleware based on the method
 * @param upload
 * @param options
 * @param method
 * @returns
 */
function getMulterMiddleware(
  upload: any,
  options: FieldOptions | Array<FieldOptions> | { none?: boolean; any?: boolean },
  method: "single" | "array" | "fields" | "none" | "any",
): RequestHandler {
  const report: Report = new Report();

  switch (method) {
    case "single":
      return upload.single((options as FieldOptions).fieldName);
    case "array":
      return upload.array((options as FieldOptions).fieldName, (options as FieldOptions).maxCount);
    case "fields": {
      const fieldsOptions = (options as Array<FieldOptions>).map((opt) => ({
        name: opt.fieldName,
        maxCount: opt.maxCount,
      }));
      return upload.fields(fieldsOptions);
    }
    case "none":
      return upload.none();
    case "any":
      return upload.any();
    default:
      throw report.error(
        `Unsupported Multer method: ${method}`,
        StatusCode.InternalServerError,
        "multer-decorator",
      );
  }
}
