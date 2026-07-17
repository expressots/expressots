/**
 * ExpressoTS Dependency Injection
 *
 * @layer public
 * @audience application-developers
 * @concept dependency-injection
 * @difficulty intermediate
 *
 * @summary Quick Start
 * ExpressoTS ships its own embedded dependency injection container with an
 * Inversify-compatible API surface (Container, injectable, inject, scopes).
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
 * The API is intentionally compatible with the InversifyJS surface so
 * existing knowledge and most upstream examples transfer directly.
 *
 * @public API
 */

import * as keys from "./constants/metadata_keys.js";
export const METADATA_KEY = keys;
export { Container } from "./container/container.js";
export {
  Scope,
  BindingTypeEnum,
  TargetTypeEnum,
} from "./constants/literal_types.js";
export {
  AsyncContainerModule,
  ContainerModule,
} from "./container/container_module.js";
export { createTaggedDecorator } from "./annotation/decorator_utils.js";
export { injectable } from "./annotation/injectable.js";
export { tagged } from "./annotation/tagged.js";
export { named } from "./annotation/named.js";
export { inject } from "./annotation/inject.js";
export { LazyServiceIdentifier } from "./annotation/lazy_service_identifier.js";
export { optional } from "./annotation/optional.js";
export { unmanaged } from "./annotation/unmanaged.js";
export { multiInject } from "./annotation/multi_inject.js";
export { targetName } from "./annotation/target_name.js";
export { postConstruct } from "./annotation/post_construct.js";
export { preDestroy } from "./annotation/pre_destroy.js";
export { MetadataReader } from "./planning/metadata_reader.js";
export { id } from "./utils/id.js";
export { interfaces } from "./interfaces/interfaces.js";
export { decorate } from "./annotation/decorator_utils.js";
export {
  forEachBinding,
  getBoundImplementations,
} from "./container-introspection.js";
export {
  traverseAncerstors,
  taggedConstraint,
  namedConstraint,
  typeConstraint,
} from "./syntax/constraint_helpers.js";
export { getServiceIdentifierAsString } from "./utils/serialization.js";
export { multiBindToService } from "./utils/binding_utils.js";
export { ScopeRegistry, globalScopeRegistry } from "./scope/scope-registry.js";
