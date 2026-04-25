import { Metadata } from "../planning/metadata.js";
import { createTaggedDecorator } from "./decorator_utils.js";

// Used to add custom metadata which is used to resolve metadata-based contextual bindings.
function tagged<T>(
  metadataKey: string | number | symbol,
  metadataValue: T | unknown,
): ParameterDecorator {
  return createTaggedDecorator(new Metadata(metadataKey, metadataValue));
}

export { tagged };
