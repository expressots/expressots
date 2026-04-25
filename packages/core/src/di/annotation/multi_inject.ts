import * as METADATA_KEY from "../constants/metadata_keys.js";
import { injectBase } from "./inject_base.js";

const multiInject = injectBase(METADATA_KEY.MULTI_INJECT_TAG);

export { multiInject };
