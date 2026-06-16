/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";

import interfaces from "../interfaces/interfaces.js";
import { METADATA_KEY } from "../constants.js";
import {
  interfaces as inversifyInterfaces,
  ContainerModule,
} from "../../inversify.js";

/**
 * Builds a ContainerModule from all @provide() decorated classes.
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Discovers all classes decorated with @provide() or fluentProvide()
 * - Creates bindings for each discovered provider
 * - Returns ContainerModule that can be loaded into container
 *
 * **Used By**
 * - AppContainer automatically loads this module
 * - Provides auto-discovery of providers
 *
 * @returns ContainerModule with all provider bindings
 *
 * @internal
 */
function buildProviderModule(): inversifyInterfaces.ContainerModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return new ContainerModule((bind, unbind) => {
    const provideMetadata: Array<interfaces.ProvideSyntax> =
      Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];
    provideMetadata.map((metadata) => resolve(metadata, bind));
  });
}

function resolve(
  metadata: interfaces.ProvideSyntax,
  bind: inversifyInterfaces.Bind,
): inversifyInterfaces.BindingWhenOnSyntax<any> {
  return metadata.constraint(bind, metadata.implementationType);
}
export default buildProviderModule;
