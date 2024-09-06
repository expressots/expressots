/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";

import interfaces from "../interfaces/interfaces";
import { METADATA_KEY } from "../constants";
import {
  interfaces as inversifyInterfaces,
  ContainerModule,
} from "../../inversify";

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
