import type {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { interfaces as inversifyInterfaces } from "inversify";
import { HTTP_VERBS_ENUM, PARAMETER_TYPE } from "./constants";
import { HttpResponseMessage } from "./httpResponseMessage";

type Prototype<T> = {
  [P in keyof T]: T[P] extends NewableFunction ? T[P] : T[P] | undefined;
} & {
  constructor: NewableFunction;
};

interface ConstructorFunction<T = Record<string, unknown>> {
  new (...args: Array<unknown>): T;
  prototype: Prototype<T>;
}

export type DecoratorTarget<T = unknown> =
  | ConstructorFunction<T>
  | Prototype<T>;

export type Middleware = string | symbol | RequestHandler;

export type ControllerHandler = (...params: Array<unknown>) => unknown;
export type BaseController = Record<string, ControllerHandler>;
export interface Controller {}

export interface ControllerMetadata {
  middleware: Array<Middleware>;
  path: string;
  target: DecoratorTarget;
}

export interface ControllerMethodMetadata extends ControllerMetadata {
  key: string;
  method: keyof typeof HTTP_VERBS_ENUM;
}

export interface ControllerParameterMetadata {
  [methodName: string]: Array<ParameterMetadata>;
}

export interface ParameterMetadata {
  index: number;
  injectRoot: boolean;
  parameterName?: string | undefined;
  type: PARAMETER_TYPE;
}

export type ExtractedParameters =
  | Array<ParameterMetadata>
  | [Request, Response, NextFunction]
  | Array<unknown>;

export type HandlerDecorator = (
  target: DecoratorTarget,
  key: string,
  value: unknown,
) => void;

export type ConfigFunction = (app: Application) => void;

export interface RoutingConfig {
  rootPath: string;
}

export interface Principal<T = unknown> {
  details: T;
  isAuthenticated(): Promise<boolean>;
  // Allows role-based auth
  isInRole(role: string): Promise<boolean>;
  // Allows content-based auth
  isResourceOwner(resourceId: unknown): Promise<boolean>;
}

export interface AuthProvider {
  getUser(req: Request, res: Response, next: NextFunction): Promise<Principal>;
}

export interface HttpContext<T = unknown> {
  container: inversifyInterfaces.Container;
  request: Request;
  response: Response;
  user: Principal<T>;
}

export interface IHttpActionResult {
  executeAsync(): Promise<HttpResponseMessage>;
}

export interface RouteDetails {
  args?: Array<string>;
  route: string;
}

export interface RouteInfo {
  controller: string;
  endpoints: Array<RouteDetails>;
}

export interface RawMetadata {
  controllerMetadata: ControllerMetadata;
  methodMetadata: Array<ControllerMethodMetadata>;
  parameterMetadata: ControllerParameterMetadata;
}
