/**
 * Registry for managing custom scope stores in dependency injection.
 *
 * @layer public
 * @audience application-developers
 * @concept scope-management
 * @difficulty advanced
 *
 * @summary Quick Start
 * Manages custom scope stores for multi-tenant or transaction-scoped services.
 * Typically used internally by the framework.
 *
 * @example
 * ```typescript
 * const registry = new ScopeRegistry();
 * const tenantScope = registry.getScopeStore("tenant");
 * tenantScope.set(bindingId, instance);
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * ScopeRegistry maintains separate stores for each custom scope:
 * - Each scope has its own Map of binding IDs to instances
 * - Instances are cached per scope value
 * - Used by InversifyJS container for custom scope resolution
 *
 * **Use Cases**
 * - Multi-tenant applications (tenant scope)
 * - Transaction management (transaction scope)
 * - Workflow orchestration (workflow scope)
 *
 * @see {@link provideInScope} for registering services with custom scopes
 *
 * @public API
 */
export class ScopeRegistry {
  private stores = new Map<string, Map<number, unknown>>();

  /**
   * Get or create a scope store for the given scope name.
   *
   * @layer public
   * @audience application-developers
   *
   * @param scopeName - The name of the custom scope (e.g., "tenant", "transaction")
   * @returns The scope store Map for the given scope name
   *
   * @example
   * ```typescript
   * const registry = new ScopeRegistry();
   * const tenantScope = registry.getScopeStore("tenant");
   * // Use tenantScope to store/retrieve instances
   * ```
   *
   * @public API
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
