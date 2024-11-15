/**
 * Converts a string from any case (camelCase, PascalCase, kebab-case, snake_case) to camelCase.
 * @param str - The input string to be converted.
 * @returns The converted string in camelCase.
 */
export function anyCaseToCamelCase(str: string): string {
    return str
      .replace(/[-_]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

/**
 * Converts a string from any case (camelCase, PascalCase, kebab-case, snake_case) to kebab-case.
 * @param str - The input string to be converted.
 * @returns The converted string in kebab-case.
 */
export function anyCaseToKebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // Convert camelCase and PascalCase to kebab-case
      .replace(/_/g, '-') // Convert snake_case to kebab-case
      .toLowerCase(); // Ensure all characters are lowercase
}

/**
 * Converts a string from any case (camelCase, PascalCase, kebab-case, snake_case) to PascalCase.
 * @param str - The input string to be converted.
 * @returns The converted string in PascalCase.
 */
export function anyCaseToPascalCase(str: string): string {
    return str
      .replace(/[-_]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^[a-z]/, (char) => char.toUpperCase());
}

/**
 * Converts a string from any case (camelCase, PascalCase, kebab-case, snake_case) to snake_case.
 * @param str - The input string to be converted.
 * @returns The converted string in snake_case.
 */
export function anyCaseToSnakeCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[-]+/g, '_')
      .toLowerCase();
}

/**
 * Converts a string from any case (camelCase, PascalCase, kebab-case, snake_case) to UPPER CASE.
 * @param str - The input string to be converted.
 * @returns The converted string in UPPER CASE.
 */
export function anyCaseToUpperCase(str: string): string {
    return str.replace(/[-_]+(.)?/g, (_, char) => (char ? char.toUpperCase() : '')).toUpperCase();
}

/**
 * Converts a string from any case (camelCase, PascalCase, kebab-case, snake_case) to lower case.
 * @param str - The input string to be converted.
 * @returns The converted string in lower case.
 */
export function anyCaseToLowerCase(str: string): string {
    return str.replace(/[-_]+(.)?/g, (_, char) => (char ? char.toLowerCase() : '')).toLowerCase();
}