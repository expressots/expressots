/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";

import {
  decorate,
  injectable,
  METADATA_KEY as inversify_METADATA_KEY,
} from "../../inversify";
import { interfaces as inversifyInterfaces } from "../../../di/inversify";
import interfaces from "../interfaces/interfaces";
import { METADATA_KEY } from "../constants";

function provide(
  serviceIdentifier: inversifyInterfaces.ServiceIdentifier<any>,
  force?: boolean,
): any {
  return function (target: any) {
    const isAlreadyDecorated = Reflect.hasOwnMetadata(
      inversify_METADATA_KEY.PARAM_TYPES,
      target,
    );
    const redecorateWithInject = force === true;

    if (redecorateWithInject === true && isAlreadyDecorated === false) {
      decorate(injectable(), target);
    } else if (redecorateWithInject === true && isAlreadyDecorated === true) {
      // Do nothing
    } else {
      try {
        decorate(injectable(), target);
      } catch (e) {
        throw new Error(
          "Cannot apply @provide decorator multiple times but is has been used " +
            `multiple times in ${target.name} ` +
            "Please use @provide(ID, true) if you are trying to declare multiple bindings!",
        );
      }
    }

    const currentMetadata: interfaces.ProvideSyntax = {
      constraint: (bind: inversifyInterfaces.Bind, bindTarget: any) =>
        bind(serviceIdentifier).to(bindTarget),
      implementationType: target,
    };

    const previousMetadata: Array<interfaces.ProvideSyntax> =
      Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];

    const newMetadata = [currentMetadata, ...previousMetadata];

    Reflect.defineMetadata(METADATA_KEY.provide, newMetadata, Reflect);
    return target;
  };
}

export default provide;
