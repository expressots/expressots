import * as ERRORS_MSGS from "../constants/error_msgs.js";
import * as METADATA_KEY from "../constants/metadata_keys.js";
import { propertyEventDecorator } from "./property_event_decorator.js";

const preDestroy = propertyEventDecorator(
  METADATA_KEY.PRE_DESTROY,
  ERRORS_MSGS.MULTIPLE_PRE_DESTROY_METHODS,
);

export { preDestroy };
