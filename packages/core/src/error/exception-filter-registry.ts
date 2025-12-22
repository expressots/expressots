import "reflect-metadata";
import { inject, injectable, Container, interfaces } from "../di/inversify";
import { Logger } from "../provider/logger/logger.provider";
import type {
  IExceptionFilter,
  ExceptionFilterMetadata,
  ErrorConstructor,
} from "./exception-filter.interface";
import { EXCEPTION_FILTER_METADATA_KEY } from "./exception-filter-constants";

type ExceptionConstructor = ErrorConstructor;

/**
 * Helper to check if a value is a constructor function
 */
function isConstructor(value: unknown): value is ExceptionConstructor {
  return (
    typeof value === "function" &&
    value.prototype &&
    value.prototype.constructor === value
  );
}

/**
 * Registry for managing exception filters with automatic discovery
 * Supports exception type inheritance matching
 */
@injectable()
export class ExceptionFilterRegistry {
  private filters = new Map<ExceptionConstructor, Array<IExceptionFilter>>();
  private initialized = false;

  constructor(
    @inject(Container) private container: interfaces.Container,
    @inject(Logger) private logger: Logger,
  ) {}

  /**
   * Initialize the registry by auto-discovering all filters decorated with @Catch
   * This should be called after the container is fully configured
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      // Get all filters registered via @Catch decorator
      const filterMetadata =
        (Reflect.getMetadata(
          EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
          Reflect,
        ) as Array<ExceptionFilterMetadata>) || [];

      filterMetadata.forEach(({ exceptionTypes, filter }) => {
        try {
          // Try to get filter from container (if @provide() decorated)
          let filterInstance: IExceptionFilter;

          if (this.container.isBound(filter)) {
            filterInstance = this.container.get<IExceptionFilter>(filter);
          } else {
            // Create instance manually if not in container
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            filterInstance = new (filter as any)();
            // Try to inject dependencies if possible
            if (this.container.isBound(Logger)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (filterInstance as any).logger = this.container.get(Logger);
            }
            if (this.container.isBound("Report")) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (filterInstance as any).report = this.container.get("Report");
            }
          }

          // Register filter for each exception type
          exceptionTypes.forEach((exceptionType) => {
            if (!this.filters.has(exceptionType)) {
              this.filters.set(exceptionType, []);
            }
            this.filters.get(exceptionType)!.push(filterInstance);
          });
        } catch (error) {
          this.logger.warn(
            `Failed to register exception filter ${filter.name}: ${error}`,
            "exception-filter-registry",
          );
        }
      });

      this.initialized = true;
      this.logger.info(
        `Exception filter registry initialized with ${filterMetadata.length} filters`,
        "exception-filter-registry",
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize exception filter registry: ${error}`,
        "exception-filter-registry",
      );
    }
  }

  /**
   * Get filters for a specific exception type
   * Supports inheritance - filters for parent types will handle child exceptions
   * @param exception - The exception instance
   * @returns Array of matching exception filters
   */
  getFilters(exception: Error): Array<IExceptionFilter> {
    const filters: Array<IExceptionFilter> = [];
    const visitedTypes = new Set<ExceptionConstructor>();

    // Walk up the prototype chain to find matching filters
    let currentType: ExceptionConstructor | null = null;

    // Start with the exception's constructor
    if (isConstructor(exception.constructor)) {
      currentType = exception.constructor as ExceptionConstructor;
    }

    while (
      currentType &&
      isConstructor(currentType) &&
      !visitedTypes.has(currentType)
    ) {
      visitedTypes.add(currentType);

      if (this.filters.has(currentType)) {
        filters.push(...this.filters.get(currentType)!);
      }

      // Move to parent class
      const parent = Object.getPrototypeOf(currentType);
      if (isConstructor(parent)) {
        currentType = parent as ExceptionConstructor;
      } else {
        currentType = null;
      }
    }

    // Add global catch-all filters (Error base class)
    if (isConstructor(Error)) {
      const ErrorConstructor = Error as ExceptionConstructor;
      if (this.filters.has(ErrorConstructor)) {
        const globalFilters = this.filters.get(ErrorConstructor)!;
        // Only add if not already included
        globalFilters.forEach((filter) => {
          if (!filters.includes(filter)) {
            filters.push(filter);
          }
        });
      }
    }

    return filters;
  }

  /**
   * Manually register a filter for specific exception types
   * Useful for programmatic registration
   * @param exceptionTypes - Exception types to register for
   * @param filter - Filter instance
   */
  registerFilter(
    exceptionTypes: Array<ErrorConstructor>,
    filter: IExceptionFilter,
  ): void {
    exceptionTypes.forEach((exceptionType) => {
      if (!this.filters.has(exceptionType)) {
        this.filters.set(exceptionType, []);
      }
      this.filters.get(exceptionType)!.push(filter);
    });
  }

  /**
   * Clear all registered filters
   */
  clear(): void {
    this.filters.clear();
    this.initialized = false;
  }
}
