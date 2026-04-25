import * as ERRORS_MSGS from "../constants/error_msgs.js";
import * as METADATA_KEY from "../constants/metadata_keys.js";
import { propertyEventDecorator } from "./property_event_decorator.js";

const postConstruct = propertyEventDecorator(
  METADATA_KEY.POST_CONSTRUCT,
  ERRORS_MSGS.MULTIPLE_POST_CONSTRUCT_METHODS,
);

export { postConstruct };
