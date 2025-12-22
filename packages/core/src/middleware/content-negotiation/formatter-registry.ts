import { interfaces } from "../../di/interfaces/interfaces";
import { IContentFormatter } from "../interfaces/content-negotiation.interface";

/**
 * Registry for managing content formatters with DI support and caching.
 */
export class FormatterRegistry {
  private formatters: Map<string, IContentFormatter> = new Map();
  private formatterClasses: Map<string, new () => IContentFormatter> = new Map();
  private cacheEnabled: boolean = true;
  private container?: interfaces.Container;

  constructor(container?: interfaces.Container) {
    this.container = container;
  }

  /**
   * Registers a formatter class.
   * @param formatterClass - The formatter class constructor
   */
  register(formatterClass: new () => IContentFormatter): void {
    const instance = this.createFormatterInstance(formatterClass);
    const contentType = instance.getContentType();
    const supportedTypes = instance.getSupportedTypes();

    // Register by primary content type
    this.formatterClasses.set(contentType, formatterClass);

    // Cache instance if caching is enabled
    if (this.cacheEnabled) {
      this.formatters.set(contentType, instance);
    }

    // Register all supported types
    supportedTypes.forEach((type) => {
      if (!this.formatterClasses.has(type)) {
        this.formatterClasses.set(type, formatterClass);
      }
    });
  }

  /**
   * Registers multiple formatter classes.
   * @param formatterClasses - Array of formatter class constructors
   */
  registerAll(formatterClasses: Array<new () => IContentFormatter>): void {
    formatterClasses.forEach((formatterClass) => {
      try {
        this.register(formatterClass);
      } catch {
        // Silently skip failed formatter registrations
      }
    });
  }

  /**
   * Gets a formatter for the given content type.
   * @param contentType - The content type to get a formatter for
   * @returns The formatter instance, or undefined if not found
   */
  getFormatter(contentType: string): IContentFormatter | undefined {
    // Try exact match first
    if (this.cacheEnabled && this.formatters.has(contentType)) {
      return this.formatters.get(contentType);
    }

    // Try class-based lookup
    const formatterClass = this.formatterClasses.get(contentType);
    if (formatterClass) {
      const instance = this.createFormatterInstance(formatterClass);
      if (this.cacheEnabled) {
        this.formatters.set(contentType, instance);
      }
      return instance;
    }

    return undefined;
  }

  /**
   * Finds a formatter that can handle the given content type (supports wildcards).
   * @param contentType - The content type to find a formatter for
   * @returns The formatter instance, or undefined if not found
   */
  findFormatter(contentType: string): IContentFormatter | undefined {
    // Try exact match
    const exact = this.getFormatter(contentType);
    if (exact) {
      return exact;
    }

    // Try partial match (e.g., "application/*" matches "application/json")
    const [mainType, subtype] = contentType.split("/");
    if (subtype === "*" && mainType) {
      // Find first formatter with matching main type
      for (const [type, formatterClass] of this.formatterClasses.entries()) {
        const [fmtMainType] = type.split("/");
        if (fmtMainType === mainType) {
          return this.createFormatterInstance(formatterClass);
        }
      }
    }

    // Try wildcard match (*/*)
    if (contentType === "*/*") {
      // Return highest priority formatter
      let highestPriority = -1;
      let bestFormatter: IContentFormatter | undefined;

      for (const formatterClass of this.formatterClasses.values()) {
        const instance = this.createFormatterInstance(formatterClass);
        const priority = instance.getPriority?.() ?? 1.0;
        if (priority > highestPriority) {
          highestPriority = priority;
          bestFormatter = instance;
        }
      }

      return bestFormatter;
    }

    return undefined;
  }

  /**
   * Gets all registered formatters.
   * @returns Array of formatter instances
   */
  getAllFormatters(): Array<IContentFormatter> {
    const formatters: Array<IContentFormatter> = [];
    for (const formatterClass of this.formatterClasses.values()) {
      const instance = this.createFormatterInstance(formatterClass);
      formatters.push(instance);
    }
    return formatters;
  }

  /**
   * Checks if a formatter is registered for the given content type.
   * @param contentType - The content type to check
   * @returns True if a formatter is registered
   */
  hasFormatter(contentType: string): boolean {
    return this.formatterClasses.has(contentType) || this.findFormatter(contentType) !== undefined;
  }

  /**
   * Enables or disables formatter caching.
   * @param enabled - Whether to enable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.formatters.clear();
    }
  }

  /**
   * Clears the formatter cache.
   */
  clearCache(): void {
    this.formatters.clear();
  }

  /**
   * Creates a formatter instance, trying DI container first, then direct instantiation.
   * @param formatterClass - The formatter class constructor
   * @returns Formatter instance
   */
  private createFormatterInstance(
    formatterClass: new () => IContentFormatter,
  ): IContentFormatter {
    // Try to resolve from DI container first
    if (this.container) {
      try {
        const identifier = Symbol.for(formatterClass.name);
        if (this.container.isBound(identifier)) {
          return this.container.get<IContentFormatter>(identifier);
        }
      } catch {
        // Fall through to direct instantiation
      }
    }

    // Direct instantiation
    return new formatterClass();
  }
}

