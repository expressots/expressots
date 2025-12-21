/**
 * Route parameter patterns for common use cases.
 * These are Express regex patterns that can be used in route paths.
 *
 * @example
 * ```typescript
 * import { Patterns, pattern } from "@expressots/adapter-express";
 *
 * @Get(`/users/${pattern("id", Patterns.NUMERIC_ID)}`)
 * getUserById(@param("id") id: number) {
 *   // Only matches numeric IDs like /users/123
 * }
 *
 * @Get(`/documents/${pattern("uuid", Patterns.UUID)}`)
 * getDocument(@param("uuid") uuid: string) {
 *   // Only matches valid UUIDs
 * }
 * ```
 *
 * @public API
 */
export const Patterns = {
  /**
   * Matches one or more digits (numeric ID)
   * Example: /users/123 ✅, /users/abc ❌
   */
  NUMERIC_ID: "(\\d+)",

  /**
   * Matches a valid UUID v4 format
   * Example: /documents/550e8400-e29b-41d4-a716-446655440000 ✅
   */
  UUID: "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",

  /**
   * Matches lowercase letters, numbers, and hyphens (URL-friendly slug)
   * Example: /posts/my-awesome-post ✅, /posts/My_Post ❌
   */
  SLUG: "([a-z0-9-]+)",

  /**
   * Matches alphanumeric characters (letters and numbers only)
   * Example: /codes/ABC123 ✅, /codes/ABC-123 ❌
   */
  ALPHANUMERIC: "([a-zA-Z0-9]+)",

  /**
   * Matches lowercase letters only
   * Example: /tags/javascript ✅, /tags/JavaScript ❌
   */
  LOWERCASE: "([a-z]+)",

  /**
   * Matches uppercase letters only
   * Example: /codes/USD ✅, /codes/usd ❌
   */
  UPPERCASE: "([A-Z]+)",

  /**
   * Matches email format (basic validation)
   * Example: /users/user@example.com ✅
   */
  EMAIL: "([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})",

  /**
   * Matches hexadecimal string (e.g., color codes, hash)
   * Example: /colors/ff5733 ✅, /colors/xyz ❌
   */
  HEXADECIMAL: "([0-9a-fA-F]+)",

  /**
   * Matches MongoDB ObjectId format (24 hex characters)
   * Example: /documents/507f1f77bcf86cd799439011 ✅
   */
  MONGO_ID: "([0-9a-fA-F]{24})",
} as const;

/**
 * Helper function to build route parameter patterns.
 * This is optional - you can also use Patterns directly in template strings.
 *
 * @param paramName - The parameter name (e.g., "id", "uuid")
 * @param pattern - The pattern from Patterns
 * @returns The formatted route parameter with pattern
 *
 * @example
 * ```typescript
 * import { pattern, Patterns } from "@expressots/adapter-express";
 *
 * @Get(`/users/${pattern("id", Patterns.NUMERIC_ID)}`)
 * getUserById(@param("id") id: number) {
 *   // Route: /users/:id(\\d+)
 * }
 * ```
 *
 * @public API
 */
export function pattern(paramName: string, patternValue: string): string {
  return `:${paramName}(${patternValue})`;
}
