import type { GuardResult } from "../guard.interface";

/**
 * Interface for guard result caching
 */
export interface IGuardCache {
  /**
   * Get cached guard result
   * @param scope - Scope identifier (e.g., request ID, tenant ID)
   * @param key - Cache key
   * @returns Cached result or null if not found
   */
  get(scope: string, key: string): GuardResult | null;

  /**
   * Set cached guard result
   * @param scope - Scope identifier
   * @param key - Cache key
   * @param result - Guard result to cache
   */
  set(scope: string, key: string, result: GuardResult): void;

  /**
   * Clear all cached results for a scope
   * @param scope - Scope identifier
   */
  clearScope(scope: string): void;

  /**
   * Clear all cached results
   */
  clear(): void;
}
