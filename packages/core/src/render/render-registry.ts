import type { EngineAdapter } from "./render-interface.js";
import type { EngineType } from "./render-config.js";

/**
 * Engine Registry
 *
 * @description Manages registration and lookup of template engine adapters.
 * Provides O(1) lookup by engine name and by file extension.
 *
 * @public API
 */
export class EngineRegistry {
  /** Map of engine name to adapter */
  private engines = new Map<string, EngineAdapter>();
  /** Map of file extension to adapter for quick lookup */
  private extensionMap = new Map<string, EngineAdapter>();

  /**
   * Register an engine adapter.
   *
   * @param adapter - Engine adapter to register
   */
  register(adapter: EngineAdapter): void {
    this.engines.set(adapter.name, adapter);

    // Map all extensions to this adapter
    for (const ext of adapter.extensions) {
      this.extensionMap.set(ext.toLowerCase(), adapter);
    }
  }

  /**
   * Get an engine adapter by name.
   *
   * @param name - Engine name
   * @returns Engine adapter or undefined
   */
  get(name: string): EngineAdapter | undefined {
    return this.engines.get(name.toLowerCase());
  }

  /**
   * Get an engine adapter by file extension.
   *
   * @param extension - File extension (with or without dot)
   * @returns Engine adapter or undefined
   */
  getByExtension(extension: string): EngineAdapter | undefined {
    const ext = extension.startsWith(".") ? extension : `.${extension}`;
    return this.extensionMap.get(ext.toLowerCase());
  }

  /**
   * Get all registered engine adapters.
   *
   * @returns Array of all engine adapters
   */
  getAll(): Array<EngineAdapter> {
    return Array.from(this.engines.values());
  }

  /**
   * Get all registered engine names.
   *
   * @returns Array of engine names
   */
  getNames(): Array<string> {
    return Array.from(this.engines.keys());
  }

  /**
   * Check if an engine is registered.
   *
   * @param name - Engine name
   * @returns Whether the engine is registered
   */
  has(name: string): boolean {
    return this.engines.has(name.toLowerCase());
  }

  /**
   * Check if an extension is supported.
   *
   * @param extension - File extension
   * @returns Whether the extension is supported
   */
  hasExtension(extension: string): boolean {
    const ext = extension.startsWith(".") ? extension : `.${extension}`;
    return this.extensionMap.get(ext.toLowerCase()) !== undefined;
  }

  /**
   * Unregister an engine adapter.
   *
   * @param name - Engine name to unregister
   * @returns Whether the engine was unregistered
   */
  unregister(name: string): boolean {
    const adapter = this.engines.get(name.toLowerCase());
    if (adapter) {
      // Remove from engines map
      this.engines.delete(name.toLowerCase());

      // Remove extensions
      for (const ext of adapter.extensions) {
        this.extensionMap.delete(ext.toLowerCase());
      }
      return true;
    }
    return false;
  }

  /**
   * Clear all registered engines.
   */
  clear(): void {
    this.engines.clear();
    this.extensionMap.clear();
  }

  /**
   * Get the number of registered engines.
   *
   * @returns Number of engines
   */
  get size(): number {
    return this.engines.size;
  }

  /**
   * Map extension to engine type.
   *
   * @param extension - File extension
   * @returns Engine type or undefined
   */
  mapExtensionToEngineType(extension: string): EngineType | undefined {
    const adapter = this.getByExtension(extension);
    return adapter?.name as EngineType | undefined;
  }
}
