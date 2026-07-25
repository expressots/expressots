import { ENV_VAR_REGEX } from "./constants.js";
import { IConfigOptions } from "./interfaces.js";

/**
 * Matches the options passed in the command line
 * @param args - The arguments passed in the command line
 * @returns The options passed in the command line
 */
export function optionMatcher(args: Array<string>): IConfigOptions {
  return args.reduce<Record<string, string>>((previous, current) => {
    const matches = current.match(ENV_VAR_REGEX);
    if (matches) {
      previous[matches[1]] = matches[2];
    }
    return previous;
  }, {}) as IConfigOptions;
}
