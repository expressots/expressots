/**
 * Interface for config options
 * @public API
 */
export interface IConfigOptions {
  /**
   * Default: `path.resolve(process.cwd(), '.env')`
   *
   * Specify a custom path if your file containing environment variables is located elsewhere.
   * Can also be an array of strings, specifying multiple paths.
   *
   * example: `require('dotenv').config({ path: '/custom/path/to/.env' })`
   * example: `require('dotenv').config({ path: ['/path/to/first.env', '/path/to/second.env'] })`
   */
  path?: string | Array<string> | URL;
  /**
   * Default: `utf8`
   *
   * Specify the encoding of your file containing environment variables.
   *
   * example: `require('dotenv').config({ encoding: 'latin1' })`
   */
  encoding?: string;
  /**
   * Default: `false`
   *
   * Turn on logging to help debug why certain keys or values are not being set as you expect.
   *
   * example: `require('dotenv').config({ debug: process.env.DEBUG })`
   */
  debug?: boolean;
  /**
   * Default: `false`
   *
   * Override any environment variables that have already been set on your machine with values from your .env file.
   *
   * example: `require('dotenv').config({ override: true })`
   */
  override?: boolean;
  /**
   * Default: `process.env`
   *
   * Specify an object to write your secrets to. Defaults to process.env environment variables.
   *
   * example: `const processEnv = {}; require('dotenv').config({ processEnv: processEnv })`
   */
  envObject?: IEnvObject;
  /**
   * Default: `undefined`
   *
   * Pass the DOTENV_KEY directly to config options. Defaults to looking for process.env.DOTENV_KEY environment variable. Note this only applies to decrypting .env.vault files. If passed as null or undefined, or not passed at all, dotenv falls back to its traditional job of parsing a .env file.
   *
   * example: `require('dotenv').config({ DOTENV_KEY: 'dotenv://:key_1234…@dotenvx.com/vault/.env.vault?environment=production' })`
   */
  vaultEnvKey?: string;
}

/**
 * Interface for environment variables
 * @public API
 */
export interface IEnvObject {
  [name: string]: string;
}

/**
 * Interface for dotenv parse output
 * @public API
 */
export interface IConfigOutput {
  error?: Error;
  parsed?: IEnvObject;
}
