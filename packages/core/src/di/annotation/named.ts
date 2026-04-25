import * as METADATA_KEY from "../constants/metadata_keys.js";
import { Metadata } from "../planning/metadata.js";
import { createTaggedDecorator } from "./decorator_utils.js";

// Used to add named metadata which is used to resolve name-based contextual bindings.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function named(name: string | number | symbol) {
  return createTaggedDecorator(new Metadata(METADATA_KEY.NAMED_TAG, name));
}

export { named };
