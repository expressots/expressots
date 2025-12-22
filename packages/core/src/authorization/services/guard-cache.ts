import { injectable } from "../../di/inversify";
import type { GuardResult } from "../guard.interface";
import type { IGuardCache } from "./guard-cache.interface";

/**
 * Implementation of guard result caching
 * Caches results per scope (request, tenant, etc.)
 * Note: This is bound manually in setupAuthorization() to allow user overrides
 */
@injectable()
export class GuardCache implements IGuardCache {
  // Scope -> Cache Key -> Result
  private cache = new Map<string, Map<string, GuardResult>>();

  /**
   * Get cached guard result
   */
  get(scope: string, key: string): GuardResult | null {
    const scopeCache = this.cache.get(scope);
    if (!scopeCache) {
      return null;
    }
    return scopeCache.get(key) || null;
  }

  /**
   * Set cached guard result
   */
  set(scope: string, key: string, result: GuardResult): void {
    if (!this.cache.has(scope)) {
      this.cache.set(scope, new Map());
    }
    this.cache.get(scope)!.set(key, result);
  }

  /**
   * Clear all cached results for a scope
   */
  clearScope(scope: string): void {
    this.cache.delete(scope);
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
  }
}

