/**
 * Enum representing different string patterns.
 * 
 * - LOWER_CASE: Represents strings in all lowercase letters. E.g. "hello"
 * - KEBAB_CASE: Represents strings separated by hyphens. E.g. "hello-world"
 * - PASCAL_CASE: Represents strings where the first letter of each word is capitalized. E.g. "HelloWorld"
 * - CAMEL_CASE: Represents strings where the first letter of the first word is lowercase and the first letter of subsequent words are capitalized. E.g. "helloWorld"
 */
const enum Pattern {
  LOWER_CASE = "lowercase",
  KEBAB_CASE = "kebab-case",
  PASCAL_CASE = "PascalCase",
  CAMEL_CASE = "camelCase",
}

/**
 * Interface describing configuration specific to Prisma provider.
 *
 * @property {string} schemaName - The name of the Prisma schema.
 * @property {string} schemaPath - The path to the Prisma schema file.
 * @property {string} entitiesPath - The path to the directory containing entities.
 * @property {string} entityNamePattern - The naming convention to use for entity names.
 */
interface IProviders {
	prisma?: {
		schemaName: string;
		schemaPath: string;
		entitiesPath: string;
		entityNamePattern: string;
	}
}

/**
 * The configuration object for the Expresso CLI.
 *
 * @property {Pattern} scaffoldPattern - The pattern to use when scaffolding files.
 * @property {string} sourceRoot - The root directory for the source files.
 * @property {boolean} opinionated - Whether or not to use the opinionated configuration.
 * @property {IProviders} providers - Specific configuration for each provider added.
 *
 * @see [Doc](https://doc.expresso-ts.com/)
 */
interface ExpressoConfig {
  scaffoldPattern: Pattern;
  sourceRoot: string;
  opinionated: boolean;
	providers?: IProviders;
}

export { ExpressoConfig, Pattern };
