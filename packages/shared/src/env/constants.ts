/**
 * LINE_REGEX is a regular expression that matches a line in a .env file.
 * It is used to parse the content of the .env file.
 */
export const LINE_REGEX =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

/**
 * ENV_VAR_REGEX is a regular expression that matches an environment variable in the command line.
 * It is used to parse the options passed in the command line.
 */
export const ENV_VAR_REGEX = /^dotenv_config_(encoding|path|debug|override|vaultEnvKey)=(.+)$/;
