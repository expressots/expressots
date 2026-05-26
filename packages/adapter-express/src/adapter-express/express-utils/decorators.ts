import "reflect-metadata";

import { inject, injectable, decorate, getGlobalUploadConfig } from "@expressots/core";
import {
  TYPE,
  METADATA_KEY,
  PARAMETER_TYPE,
  HTTP_VERBS_ENUM,
  HTTP_CODE_METADATA,
  RENDER_METADATA_KEY,
} from "./constants.js";
import type {
  Controller,
  ControllerMetadata,
  ControllerMethodMetadata,
  ControllerParameterMetadata,
  DecoratorTarget,
  HandlerDecorator,
  Middleware,
  NewableFunction,
  ParameterMetadata,
} from "./interfaces.js";
import { packageResolver } from "./resolver-multer.js";
import { RequestHandler, Request, Response, NextFunction } from "express";
import { Report, StatusCode } from "@expressots/core";
import { splitPathConstraints, createPathConstraintMiddleware } from "./path-pattern-compat.js";

// Explicit type annotation: without this, the inferred type pulls a
// non-portable path from @expressots/core's internal decorator_utils,
// which TS2742 rejects under NodeNext when emitting .d.ts files.
export const injectHttpContext: ParameterDecorator & PropertyDecorator = inject(TYPE.HttpContext);

/**
 * Controller decorator to define a new controller
 * @param path route path
 * @param middleware array of middleware to be applied to all routes in the controller
 * @public API
 */
export function controller(path: string, ...middleware: Array<Middleware>) {
  return (target: NewableFunction): void => {
    // Check for version metadata on the controller class
    const controllerVersion = Reflect.getOwnMetadata(METADATA_KEY.version, target) as
      | string
      | number
      | undefined;

    // Translate any inline regex constraints in the controller-level
    // prefix (`@controller("/users/:tenant(\\d+)")`) into a
    // request-time validator. Keeps `@controller("/")` and the common
    // case allocation-free.
    const split = splitPathConstraints(path);
    const constraintMiddleware = createPathConstraintMiddleware(split.constraints);
    const effectivePath = split.path;
    const effectiveMiddleware: Array<Middleware> = constraintMiddleware
      ? [constraintMiddleware as Middleware, ...middleware]
      : middleware;

    const currentMetadata: ControllerMetadata = {
      middleware: effectiveMiddleware,
      path: effectivePath,
      target: target as DecoratorTarget,
      version: controllerVersion,
    };

    const pathMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.path, Reflect) || {};
    const statusCodeMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.statusCode, Reflect) || {};
    const statusCodePathMapping =
      Reflect.getOwnMetadata(HTTP_CODE_METADATA.httpCode, Reflect) || {};

    for (const key in pathMetadata) {
      if (statusCodeMetadata && statusCodeMetadata[key]) {
        const methodPath = pathMetadata[key]["path"];
        // Properly join controller and method paths. The controller
        // path is the v8-cleaned `effectivePath` so the mapping key is
        // consistent with what gets registered on Express.
        let realPath: string;
        if (methodPath === "/" || methodPath === "") {
          realPath = effectivePath;
        } else if (effectivePath === "/" || effectivePath === "") {
          realPath = methodPath.startsWith("/") ? methodPath : `/${methodPath}`;
        } else {
          const basePath = effectivePath.endsWith("/") ? effectivePath.slice(0, -1) : effectivePath;
          const subPath = methodPath.startsWith("/") ? methodPath : `/${methodPath}`;
          realPath = `${basePath}${subPath}`;
        }

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
 * @example ```typescript
 * @Http(200)
 * @Get("/")
 * hello() {
 *  return "Hello World";
 * }
 * ```
 * @public API
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
 * Version decorator to define the API version for a controller or route method
 * @param version API version (e.g., "1", "1.0", "v1", or 1)
 * @returns ClassDecorator | MethodDecorator
 * @example ```typescript
 * @Version("1")
 * @controller("/users")
 * class UserController {}
 *
 * // Or at method level:
 * @Version("2")
 * @Get("/")
 * getUsers() {
 *   return "v2 users";
 * }
 * ```
 * @public API
 */
export function Version(version: string | number) {
  // Normalize version to string format (e.g., "v1" or "1" -> "v1")
  const normalizedVersion =
    typeof version === "number" ? `v${version}` : version.startsWith("v") ? version : `v${version}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any, key?: string | symbol, descriptor?: any): void => {
    if (key !== undefined && descriptor !== undefined) {
      // Method decorator - store version metadata for the method
      // This will be read by enhancedHttpMethod/Method when they create metadata
      Reflect.defineMetadata(METADATA_KEY.version, normalizedVersion, target, key);

      // Also update existing metadata if it exists
      const metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as Array<ControllerMethodMetadata> | undefined;

      if (metadataList) {
        const methodMetadata = metadataList.find((m) => m.key === key);
        if (methodMetadata) {
          methodMetadata.version = normalizedVersion;
        }
      }
    } else {
      // Class decorator - store version metadata for the controller
      // This will be read by controller decorator when it creates metadata
      Reflect.defineMetadata(METADATA_KEY.version, normalizedVersion, target);

      // Also update existing metadata if it exists
      const controllerMetadata = Reflect.getOwnMetadata(METADATA_KEY.controller, target) as
        | ControllerMetadata
        | undefined;

      if (controllerMetadata) {
        controllerMetadata.version = normalizedVersion;
      }
    }
  };
}

/**
 * Decorator to allow accept all HTTP methods
 * @param path route path, wildcard
 * @param middleware array of middleware to be applied to all routes defined in path logic
 * @public API
 */
export function All(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return Method("all", path, ...middleware);
}

/**
 * Decorator to allow GET HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 * @public API
 */
export function Get(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return enhancedHttpMethod("get", path, ...middleware);
}

/**
 * Decorator to allow POST HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 * @public API
 */
export function Post(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return Method("post", path, ...middleware);
}

/**
 * Decorator to allow PUT HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 * @public API
 */
export function Put(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return enhancedHttpMethod("put", path, ...middleware);
}

/**
 * Decorator to allow PATCH HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 * @public API
 */
export function Patch(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return enhancedHttpMethod("patch", path, ...middleware);
}

/**
 * Decorator to allow HEAD HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 * @public API
 */
export function Head(path: string, ...middleware: Array<Middleware>): HandlerDecorator {
  return Method("head", path, ...middleware);
}

/**
 * Decorator to allow DELETE HTTP method
 * @param path route path
 * @param middleware array of middleware to be applied to the route
 * @public API
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
  return (target: object, key: string | symbol): void => {
    // Check for version metadata on the method
    const methodVersion = Reflect.getOwnMetadata(METADATA_KEY.version, target, key) as
      | string
      | number
      | undefined;

    // Express 5 / path-to-regexp v8 dropped inline regex constraints
    // (`:id(\\d+)`). Split them out into a v8-compatible path + a
    // request-time validator middleware so existing routes — and our
    // {@link Patterns} / {@link pattern} public API — keep working.
    const split = splitPathConstraints(path);
    const constraintMiddleware = createPathConstraintMiddleware(split.constraints);
    const effectivePath = split.path;
    const effectiveMiddleware: Array<Middleware> = constraintMiddleware
      ? [constraintMiddleware as Middleware, ...middleware]
      : middleware;

    const metadata: ControllerMethodMetadata = {
      key: String(key),
      method,
      middleware: effectiveMiddleware,
      path: effectivePath,
      target: target as DecoratorTarget,
      version: methodVersion,
    };
    let metadataList: Array<ControllerMethodMetadata> = [];

    let pathMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.path, Reflect);

    if (pathMetadata) {
      pathMetadata[key] = {
        path: effectivePath,
        method,
      };
    } else {
      pathMetadata = {};
      pathMetadata[key] = {
        path: effectivePath,
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
 * @public API
 */
export function Method(
  method: keyof typeof HTTP_VERBS_ENUM,
  path: string,
  ...middleware: Array<Middleware>
): HandlerDecorator {
  return (target: object, key: string | symbol): void => {
    // Check for version metadata on the method
    const methodVersion = Reflect.getOwnMetadata(METADATA_KEY.version, target, key) as
      | string
      | number
      | undefined;

    // Same path-to-regexp v8 compatibility shim as `enhancedHttpMethod`.
    const split = splitPathConstraints(path);
    const constraintMiddleware = createPathConstraintMiddleware(split.constraints);
    const effectivePath = split.path;
    const effectiveMiddleware: Array<Middleware> = constraintMiddleware
      ? [constraintMiddleware as Middleware, ...middleware]
      : middleware;

    const metadata: ControllerMethodMetadata = {
      key: String(key),
      method,
      middleware: effectiveMiddleware,
      path: effectivePath,
      target: target as DecoratorTarget,
      version: methodVersion,
    };

    let metadataList: Array<ControllerMethodMetadata> = [];

    let pathMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.path, Reflect);

    if (pathMetadata) {
      pathMetadata[key] = {
        path: effectivePath,
        method,
      };
    } else {
      pathMetadata = {};
      pathMetadata[key] = {
        path: effectivePath,
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
 * @param type - The type of parameter to inject
 * @param parameterName - The name of the parameter to inject
 * @public API
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
 * @returns MethodDecorator
 * @public API
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

/**
 * Express middleware arguments type definition
 */
type ExpressMiddlewareArgs = [Request, Response, NextFunction?];

/**
 * Multer storage engine interface
 */
export interface StorageEngine {
  _handleFile(
    req: Request,
    file: MulterFile,
    callback: (error?: Error | null, info?: Partial<MulterFile>) => void,
  ): void;
  _removeFile(req: Request, file: MulterFile, callback: (error: Error | null) => void): void;
}

/**
 * Multer file interface
 */
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

/**
 * Multer limits interface
 */
export interface MulterLimits {
  fieldNameSize?: number;
  fieldSize?: number;
  fields?: number;
  fileSize?: number;
  files?: number;
  parts?: number;
  headerPairs?: number;
}

/**
 * Multer options interface
 */
export interface MulterOptions {
  dest?: string;
  storage?: StorageEngine;
  limits?: MulterLimits;
  fileFilter?: FileFilter;
}

export type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;
export type FileFilter = (req: Request, file: MulterFile, callback: FileFilterCallback) => void;
type FieldOptions = { fieldName: string; maxCount?: number };

/**
 * Type guard to check if an object is a Request
 */
function isRequest(obj: unknown): obj is Request {
  return (
    typeof obj === "object" && obj !== null && "method" in obj && "headers" in obj && "url" in obj
  );
}

/**
 * Type guard to check if an object is a Response
 */
function isResponse(obj: unknown): obj is Response {
  return (
    typeof obj === "object" && obj !== null && "status" in obj && "json" in obj && "send" in obj
  );
}

/**
 * File upload decorator to handle file uploads.
 *
 * This decorator integrates with the global upload configuration
 * set via `Middleware.upload()` in app.ts. If global config exists,
 * it will be used as defaults, with local options taking precedence.
 *
 * @param options - Field configuration (fieldName, maxCount, none, any)
 * @param multerOptions - Optional multer options (overrides global config)
 * @default { none: true }
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * // In app.ts - configure globally (optional)
 * this.Middleware.upload({
 *   destination: './uploads',
 *   limits: { fileSize: 10 * 1024 * 1024 }
 * });
 *
 * // In controller - uses global config automatically
 * @Post('avatar')
 * @FileUpload({ fieldName: 'avatar' })
 * uploadAvatar(req: Request) {
 *   return req.file;
 * }
 *
 * // Override global config for specific endpoint
 * @Post('document')
 * @FileUpload({ fieldName: 'doc' }, { limits: { fileSize: 50 * 1024 * 1024 } })
 * uploadDocument(req: Request) {
 *   return req.file;
 * }
 * ```
 *
 * @public API
 */
export function FileUpload(
  options?: FieldOptions | Array<FieldOptions> | { none?: boolean; any?: boolean },
  multerOptions?: MulterOptions,
): MethodDecorator {
  const multer = packageResolver("multer");
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let upload: RequestHandler;
  let method: "single" | "array" | "fields" | "none" | "any" = "none";

  if (multer) {
    if (options === undefined) {
      options = { none: true };
    }

    // Get global upload configuration (set via Middleware.upload())
    const globalConfig = getGlobalUploadConfig();

    // Build final multer options, merging global config with local options
    // Local options always take precedence over global config
    const finalMulterOptions: MulterOptions = {};

    // Apply global config as defaults
    if (globalConfig) {
      if (globalConfig.destination) {
        finalMulterOptions.dest = globalConfig.destination;
      }
      if (globalConfig.limits) {
        finalMulterOptions.limits = globalConfig.limits;
      }
    }

    // Apply local options (overrides global)
    if (multerOptions) {
      if (multerOptions.dest) {
        finalMulterOptions.dest = multerOptions.dest;
      }
      if (multerOptions.limits) {
        // Merge limits - local takes precedence
        finalMulterOptions.limits = {
          ...finalMulterOptions.limits,
          ...multerOptions.limits,
        };
      }
      if (multerOptions.storage) {
        finalMulterOptions.storage = multerOptions.storage;
      }
      if (multerOptions.fileFilter) {
        finalMulterOptions.fileFilter = multerOptions.fileFilter;
      }
    }

    upload = multer(finalMulterOptions);
    method = inferMulterMethod(options);
  }

  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    const originalMethod = descriptor.value as (...args: ExpressMiddlewareArgs) => unknown;
    descriptor.value = function (...args: ExpressMiddlewareArgs): any {
      const req = args.find(isRequest) as Request;
      const res = args.find(isResponse) as Response;

      const multerMiddleware: RequestHandler = getMulterMiddleware(upload, options, method);
      multerMiddleware(req, res, (err: any) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        const result = originalMethod.apply(this, args);

        if (
          res &&
          result &&
          typeof result != "undefined" &&
          !isRequest(result) &&
          !isResponse(result)
        ) {
          return res.send(result);
        }
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
 * @returns RequestHandler
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
