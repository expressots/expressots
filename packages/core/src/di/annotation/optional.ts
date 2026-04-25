import * as METADATA_KEY from "../constants/metadata_keys.js";
import { Metadata } from "../planning/metadata.js";
import { createTaggedDecorator } from "./decorator_utils.js";

function optional(): ParameterDecorator {
  return createTaggedDecorator(new Metadata(METADATA_KEY.OPTIONAL_TAG, true));
}

export { optional };
