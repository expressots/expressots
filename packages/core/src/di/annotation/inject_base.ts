import { UNDEFINED_INJECT_ANNOTATION } from "../constants/error_msgs.js";
import { Metadata } from "../planning/metadata.js";
import { createTaggedDecorator, DecoratorTarget } from "./decorator_utils.js";
import { ServiceIdentifierOrFunc } from "./lazy_service_identifier.js";

export function injectBase(metadataKey: string) {
  return <T = unknown>(serviceIdentifier: ServiceIdentifierOrFunc<T>) => {
    return (
      target: DecoratorTarget,
      targetKey?: string | symbol,
      indexOrPropertyDescriptor?: number | TypedPropertyDescriptor<T>,
    ): void => {
      if (serviceIdentifier === undefined) {
        const className =
          typeof target === "function" ? target.name : target.constructor.name;

        throw new Error(UNDEFINED_INJECT_ANNOTATION(className));
      }
      return createTaggedDecorator(
        new Metadata(metadataKey, serviceIdentifier),
      )(target, targetKey, indexOrPropertyDescriptor);
    };
  };
}
