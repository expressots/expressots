/**
 * Enum representing different string patterns.
 *
 * - LOWER_CASE: Represents strings in all lowercase letters. E.g. "hello"
 * - KEBAB_CASE: Represents strings separated by hyphens. E.g. "hello-world"
 * - PASCAL_CASE: Represents strings where the first letter of each word is capitalized. E.g. "HelloWorld"
 * - CAMEL_CASE: Represents strings where the first letter of the first word is lowercase and the first letter of subsequent words are capitalized. E.g. "helloWorld"
 * @public API
 */
export const enum Pattern {
  LOWER_CASE = "lowercase",
  KEBAB_CASE = "kebab-case",
  PASCAL_CASE = "PascalCase",
  CAMEL_CASE = "camelCase",
}

/**
 * The configuration object for the Expresso CLI.
 * @property {Pattern} scaffoldPattern - The pattern to use when scaffolding files.
 * @property {string} sourceRoot - The root directory for the source files.
 * @property {boolean} opinionated - Whether or not to use the opinionated configuration.
 * @property {object} env - The environment variables to use for development and production.
 * @property {IProviders} providers - Specific configuration for each provider added.
 * @public API
 */
export interface ExpressoConfig {
  scaffoldPattern: Pattern;
  sourceRoot: string;
  opinionated: boolean;
  env?: {
    development?: string;
    production?: string;
  };
  scaffoldSchematics?: {
    entity?: string;
    controller?: string;
    usecase?: string;
    dto?: string;
    module?: string;
    provider?: string;
    middleware?: string;
  };
}
