/**
 * InversifyJS Dependency Injection Library
 *
 * @layer public
 * @audience application-developers
 * @concept dependency-injection
 * @difficulty intermediate
 *
 * @summary Quick Start
 * ExpressoTS uses InversifyJS for dependency injection. Most InversifyJS APIs are available here.
 *
 * @example
 * ```typescript
 * import { Container, injectable, inject } from "@expressots/core";
 *
 * @injectable()
 * export class MyService {
 *   constructor(@inject("IDependency") private dep: IDependency) {}
 * }
 * ```
 *
 * @note
 * This module re-exports InversifyJS APIs. For full InversifyJS documentation,
 * see: https://github.com/inversify/InversifyJS
 *
 * @public API
 */

import * as keys from "./constants/metadata_keys";
export const METADATA_KEY = keys;
export { Container } from "./container/container";
export {
  BindingScopeEnum,
  BindingTypeEnum,
  TargetTypeEnum,
} from "./constants/literal_types";
export {
  AsyncContainerModule,
  ContainerModule,
} from "./container/container_module";
export { createTaggedDecorator } from "./annotation/decorator_utils";
export { injectable } from "./annotation/injectable";
export { tagged } from "./annotation/tagged";
export { named } from "./annotation/named";
export { inject } from "./annotation/inject";
export { LazyServiceIdentifier } from "./annotation/lazy_service_identifier";
export { LazyServiceIdentifier as LazyServiceIdentifer } from "./annotation/lazy_service_identifier";
export { optional } from "./annotation/optional";
export { unmanaged } from "./annotation/unmanaged";
export { multiInject } from "./annotation/multi_inject";
export { targetName } from "./annotation/target_name";
export { postConstruct } from "./annotation/post_construct";
export { preDestroy } from "./annotation/pre_destroy";
export { MetadataReader } from "./planning/metadata_reader";
export { id } from "./utils/id";
export { interfaces } from "./interfaces/interfaces";
export { decorate } from "./annotation/decorator_utils";
export {
  traverseAncerstors,
  taggedConstraint,
  namedConstraint,
  typeConstraint,
} from "./syntax/constraint_helpers";
export { getServiceIdentifierAsString } from "./utils/serialization";
export { multiBindToService } from "./utils/binding_utils";
export { ScopeRegistry, globalScopeRegistry } from "./scope/scope-registry";
