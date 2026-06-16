export * from "./decorators.js";
export {
  Accept,
  Consumes,
  Produces,
  CsvOptions,
  XmlOptions,
  YamlOptions,
  StreamResponse,
} from "./content-negotiation-decorators.js";
export { Controller } from "./interfaces.js";
export { Patterns, pattern } from "./route-constraints.js";
export { when, unless, isConditionalMiddleware } from "./conditional-middleware.js";
export type { ConditionalMiddlewareConfig, MiddlewareCondition } from "./conditional-middleware.js";
export { combine, sequence, isComposedMiddleware } from "./middleware-composition.js";
export type { ComposedMiddlewareConfig } from "./middleware-composition.js";
export { Catch, UseFilters } from "./exception-filter-decorators.js";
export { getControllerGuards, getMethodGuards } from "./guard-utils.js";
export { GuardContextFactory } from "./guard-context-factory.js";
export { GuardMiddleware } from "./guard-middleware.js";
export { InterceptorMiddleware, createInterceptorMiddleware } from "./interceptor-middleware.js";
export { ScopeExtractor } from "./scope-extractor.js";
export type { IScopeExtractor } from "./scope-extractor.interface.js";
export { PermissionPreloaderMiddleware } from "./permission-preloader.middleware.js";
export { TYPE } from "./constants.js";
export type { AuthProvider, Principal } from "./interfaces.js";
export { setupAuthorizationForExpress } from "./setup-authorization.js";
export { setupEventSystemForExpress } from "./setup-event-system.js";
export type { EventSystemOptions, EventSystemSetupResult } from "./setup-event-system.js";
export { setupInterceptorsForExpress } from "./setup-interceptors.js";
export type {
  InterceptorSystemOptions,
  InterceptorSystemSetupResult,
  BuiltInInterceptor,
  InterceptorClass,
} from "./setup-interceptors.js";
export { setupLazyLoadingForExpress } from "./setup-lazy-loading.js";
export type {
  LazyLoadingOptions,
  LazyLoadingSetupResult,
  LazyLoadingExpressOptions,
  LazyLoadingExpressResult,
  LazyRouteMapping,
} from "./setup-lazy-loading.js";
export { createLazyModuleMiddleware, createRouteMappings } from "./lazy-module-middleware.js";

// Validation decorators
export {
  validatedBody,
  validatedQuery,
  validatedParam,
  validatedHeaders,
  Validate,
  getValidationMetadata,
  hasValidationMetadata,
} from "./validation-decorators.js";
export type {
  ValidationSchemaMetadata,
  SchemaType,
  ValidatedDecoratorOptions,
} from "./validation-decorators.js";

// Validation service
export { ValidationService } from "./validation-service.js";

// Per-request HttpContext (replaces reflect-metadata for hot path)
export { getHttpContext, hasHttpContext } from "./http-context-store.js";
