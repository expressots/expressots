/* eslint-disable @typescript-eslint/no-explicit-any */
import interfaces from "../interfaces/interfaces";
import {
  decorate,
  injectable,
  METADATA_KEY as inversify_METADATA_KEY,
} from "../../inversify";
import { METADATA_KEY } from "../constants";

class ProvideDoneSyntax implements interfaces.ProvideDoneSyntax {
  private _binding: interfaces.BindConstraint;
  public constructor(binding: interfaces.BindConstraint) {
    this._binding = binding;
  }

  public done(force?: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    return function (target: any): any {
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
            "Cannot apply @fluentProvide decorator multiple times but is has been used " +
              `multiple times in ${target.name} ` +
              "Please use done(true) if you are trying to declare multiple bindings!",
          );
        }
      }

      const currentMetadata: interfaces.ProvideSyntax = {
        constraint: that._binding,
        implementationType: target,
      };

      const previousMetadata: Array<interfaces.ProvideSyntax> =
        Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];

      const newMetadata = [currentMetadata, ...previousMetadata];

      Reflect.defineMetadata(METADATA_KEY.provide, newMetadata, Reflect);
      return target;
    };
  }
}

export default ProvideDoneSyntax;
