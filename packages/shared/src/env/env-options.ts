/**
 * Module EnvOptions
 * Responsible for setting the options for the dotenv configuration if provided otherwise it will use the default values.
 */
import { IConfigOptions } from "./interfaces";

/**
 * The options for the dotenv configuration.
 */
export const OPTIONS: IConfigOptions = {} as IConfigOptions;

if (process.env.DOTENV_CONFIG_ENCODING != null) {
  OPTIONS.encoding = process.env.DOTENV_CONFIG_ENCODING;
}

if (process.env.DOTENV_CONFIG_PATH != null) {
  OPTIONS.path = process.env.DOTENV_CONFIG_PATH;
}

if (process.env.DOTENV_CONFIG_DEBUG != null) {
  OPTIONS.debug = process.env.DOTENV_CONFIG_DEBUG === "true";
}

if (process.env.DOTENV_CONFIG_OVERRIDE != null) {
  OPTIONS.override = process.env.DOTENV_CONFIG_OVERRIDE === "true";
}

if (process.env.DOTENV_CONFIG_DOTENV_KEY != null) {
  OPTIONS.vaultEnvKey = process.env.DOTENV_CONFIG_DOTENV_KEY;
}
