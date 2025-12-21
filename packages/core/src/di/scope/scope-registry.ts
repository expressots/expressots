/**
 * ScopeRegistry manages custom scope stores for dependency injection.
 * Each custom scope maintains its own Map of binding IDs to instances.
 *
 * @example
 * ```typescript
 * const registry = new ScopeRegistry();
 * const tenantScope = registry.getScopeStore("tenant");
 * tenantScope.set(bindingId, instance);
 * ```
 * @public API
 */
export class ScopeRegistry {
  private stores = new Map<string, Map<number, unknown>>();

  /**
   * Get or create a scope store for the given scope name.
   * @param scopeName - The name of the custom scope (e.g., "tenant", "transaction")
   * @returns The scope store Map for the given scope name
   */
  public getScopeStore(scopeName: string): Map<number, unknown> {
    if (!this.stores.has(scopeName)) {
      this.stores.set(scopeName, new Map());
    }
    return this.stores.get(scopeName)!;
  }

  /**
   * Check if a scope store exists for the given scope name.
   * @param scopeName - The name of the custom scope
   * @returns True if the scope store exists, false otherwise
   */
  public hasScope(scopeName: string): boolean {
    return this.stores.has(scopeName);
  }

  /**
   * Clear all instances from a specific scope store.
   * @param scopeName - The name of the custom scope to clear
   */
  public clearScope(scopeName: string): void {
    const store = this.stores.get(scopeName);
    if (store) {
      store.clear();
    }
  }

  /**
   * Remove a scope store entirely.
   * @param scopeName - The name of the custom scope to remove
   */
  public removeScope(scopeName: string): void {
    this.stores.delete(scopeName);
  }

  /**
   * Clear all scope stores.
   */
  public clearAll(): void {
    this.stores.clear();
  }

  /**
   * Get all registered scope names.
   * @returns Array of scope names
   */
  public getScopeNames(): Array<string> {
    return Array.from(this.stores.keys());
  }
}

/**
 * Global scope registry instance.
 * This is used by the container to manage custom scopes.
 * @internal
 */
export const globalScopeRegistry = new ScopeRegistry();
