import * as METADATA_KEY from "../constants/metadata_keys";
import { injectBase } from "./inject_base";

/**
 * Marks a constructor parameter for injection.
 * @param serviceIdentifier The service identifier
 * @return The decorator function
 * @example
 * ```typescript
 * class Engine {}
 *
 * class Car {
 *  constructor(@inject(Engine) engine: Engine) {}
 * }
 * ```
 * @public API
 */
const inject = injectBase(METADATA_KEY.INJECT_TAG);

export { inject };
