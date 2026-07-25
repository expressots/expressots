import type { Application, NextFunction, Request, RequestHandler, Response } from "express";
import { interfaces as inversifyInterfaces } from "@expressots/core";
import { HTTP_VERBS_ENUM, PARAMETER_TYPE } from "./constants.js";
import { HttpResponseMessage } from "./httpResponseMessage.js";

/**
 * Type for a constructor function (class)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NewableFunction = abstract new (...args: Array<any>) => any;

type Prototype<T> = {
  [P in keyof T]: T[P] extends NewableFunction ? T[P] : T[P] | undefined;
} & {
  constructor: NewableFunction;
};

interface ConstructorFunction<T = Record<string, unknown>> {
  new (...args: Array<unknown>): T;
  prototype: Prototype<T>;
}

export type DecoratorTarget<T = unknown> = ConstructorFunction<T> | Prototype<T>;

export interface IExpressoMiddleware {
  //readonly name: string;
  use(req: Request, res: Response, next: NextFunction): Promise<void> | void;
}

/**
 * Conditional middleware configuration type.
 * Import from conditional-middleware.ts for the full ConditionalMiddlewareConfig interface.
 */
export interface ConditionalMiddlewareConfig {
  condition: (req: Request) => boolean | Promise<boolean>;
  middleware: Middleware;
  skipOnFalse?: boolean;
}

/**
 * Composed middleware configuration type.
 * Import from middleware-composition.ts for the full ComposedMiddlewareConfig interface.
 */
export interface ComposedMiddlewareConfig {
  middleware: Array<Middleware>;
  type: "combine" | "sequence";
}

/**
 * Middleware class constructor type.
 * Supports classes that extend ExpressoMiddleware or implement IExpressoMiddleware.
 * Accepts both concrete and abstract class constructors.
 * Phase 2: Supports class references without 'new' keyword.
 */
export type MiddlewareClass =
  | (new (...args: Array<unknown>) => IExpressoMiddleware)
  | (abstract new (...args: Array<unknown>) => IExpressoMiddleware);

/**
 * Union type for all supported middleware types.
 * Phase 2: Includes class constructors (class references) for cleaner API.
 * Note: Uses 'any' for class constructors to support typeof class types (e.g., typeof AdminMiddleware).
 */
export type Middleware =
  | string
  | symbol
  | RequestHandler
  | IExpressoMiddleware
  | ConditionalMiddlewareConfig
  | MiddlewareClass
  | { prototype: IExpressoMiddleware }
  // Phase 2: Accept class constructors (typeof ClassName) - runtime type checking ensures safety
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | any;

export type ControllerHandler = (...params: Array<unknown>) => unknown;
export type BaseController = Record<string, ControllerHandler>;
export interface Controller {}

export interface ControllerMetadata {
  middleware: Array<Middleware>;
  path: string;
  target: DecoratorTarget;
  version?: string | number;
}

export interface ControllerMethodMetadata extends ControllerMetadata {
  key: string;
  method: keyof typeof HTTP_VERBS_ENUM;
  version?: string | number;
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
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) => void;

export type ConfigFunction = (app: Application) => void;

export interface RoutingConfig {
  rootPath: string;
}

/**
 * Represents the authenticated identity attached to the current HTTP context.
 * Produced by an {@link AuthProvider} and exposed to guards and controllers
 * via `HttpContext.user`.
 *
 * @typeParam T - Shape of the user details payload (e.g. a User entity or JWT claims)
 *
 * @public API
 */
export interface Principal<T = unknown> {
  /** Application-specific user details (entity, token claims, etc.). */
  details: T;
  /** Whether the current request carries a valid authenticated identity. */
  isAuthenticated(): Promise<boolean>;
  /**
   * Role-based authorization check.
   * @param role - Role name to test (e.g. "admin")
   * @returns true when the principal holds the given role
   */
  isInRole(role: string): Promise<boolean>;
  /**
   * Content-based (ownership) authorization check.
   * @param resourceId - Identifier of the resource being accessed
   * @returns true when the principal owns the resource
   */
  isResourceOwner(resourceId: unknown): Promise<boolean>;
}

/**
 * Resolves the {@link Principal} for each incoming request. Register a
 * custom provider via `setupAuthorizationForExpress(container, config,
 * middleware, MyAuthProvider)` to integrate any authentication scheme
 * (sessions, JWT, API keys).
 *
 * @public API
 */
export interface AuthProvider {
  /**
   * Resolve the principal for the current request. Called once per request
   * before the route handler executes.
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next function
   * @returns The resolved principal (use an unauthenticated principal rather than throwing for anonymous requests)
   */
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
