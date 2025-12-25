/**
 * @file log-performance.decorator.ts
 * @description Decorator for automatic performance logging of methods
 * @module @expressots/core/provider/logger/decorators
 *
 * Features:
 * - Automatic method entry/exit logging
 * - Execution time measurement
 * - Works with sync and async methods
 * - Includes class and method name in logs
 */

import { Logger } from "../logger.provider";

/**
 * Options for @LogPerformance decorator.
 * @public API
 */
export interface LogPerformanceOptions {
  /** Log level for performance logs (default: "debug") */
  logLevel?: "debug" | "info" | "warn";
  /** Custom label (default: "ClassName.methodName") */
  label?: string;
  /** Log method entry (default: true) */
  logEntry?: boolean;
  /** Log method exit (default: true) */
  logExit?: boolean;
  /** Minimum duration to log (in ms, default: 0 = log all) */
  minDuration?: number;
}

/**
 * Decorator for automatically logging method performance.
 * Logs method entry, exit, and execution time.
 *
 * @param options - Performance logging options
 * @returns Method decorator
 * @public API
 *
 * @example
 * ```typescript
 * class UserService {
 *   constructor(private logger: Logger) {}
 *
 *   @LogPerformance({ logLevel: "info" })
 *   async getUser(id: string) {
 *     // Method execution is automatically timed and logged
 *     return await this.db.findUser(id);
 *   }
 * }
 * ```
 */
export function LogPerformance(options?: LogPerformanceOptions) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);
    const label = options?.label || `${className}.${methodName}`;
    const logLevel = options?.logLevel || "debug";
    const logEntry = options?.logEntry !== false;
    const logExit = options?.logExit !== false;
    const minDuration = options?.minDuration || 0;

    // Check if method is async
    const isAsync = originalMethod.constructor.name === "AsyncFunction";

    if (isAsync) {
      // Async method
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      descriptor.value = async function (
        ...args: Array<unknown>
      ): Promise<unknown> {
        // Get logger instance (try to find it in the class)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logger: Logger | undefined = (this as any).logger;

        if (!logger) {
          // No logger available, just execute the method
          return originalMethod.apply(this, args);
        }

        if (logEntry) {
          logger.debug(`→ Entering ${label}`, {
            className,
            methodName,
            args: args.length > 0 ? `[${args.length} args]` : undefined,
          });
        }

        try {
          const startMemory = process.memoryUsage().heapUsed;
          const startTime = performance.now();
          const startCpu = process.cpuUsage();

          const result = await originalMethod.apply(this, args);

          const endTime = globalThis.performance.now();
          const endMemory = process.memoryUsage().heapUsed;
          const endCpu = process.cpuUsage();

          const duration = endTime - startTime;
          const memoryDelta = endMemory - startMemory;
          const cpuDelta = {
            user: endCpu.user - startCpu.user,
            system: endCpu.system - startCpu.system,
          };
          const cpuUsage =
            ((cpuDelta.user + cpuDelta.system) / 1000 / duration) * 100;

          if (logExit && duration >= minDuration) {
            const message = `← Exiting ${label} (${duration.toFixed(2)}ms)`;
            const logData = {
              className,
              methodName,
              duration: `${duration.toFixed(2)}ms`,
              memoryDelta: `${(memoryDelta / 1024).toFixed(1)}KB`,
              cpuUsage: isNaN(cpuUsage) ? undefined : `${cpuUsage.toFixed(1)}%`,
            };

            switch (logLevel) {
              case "info":
                logger.info(message, undefined, logData);
                break;
              case "warn":
                logger.warn(message, undefined, logData);
                break;
              case "debug":
              default:
                logger.debug(message, logData);
                break;
            }
          }

          return result;
        } catch (error) {
          logger.error(`✗ Error in ${label}`, undefined, error);
          throw error;
        }
      };
    } else {
      // Sync method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type
      descriptor.value = function (...args: Array<any>): unknown {
        // Get logger instance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logger: Logger | undefined = (this as any).logger;

        if (!logger) {
          // No logger available, just execute the method
          return originalMethod.apply(this, args);
        }

        if (logEntry) {
          logger.debug(`→ Entering ${label}`, {
            className,
            methodName,
            args: args.length > 0 ? `[${args.length} args]` : undefined,
          });
        }

        try {
          const startMemory = process.memoryUsage().heapUsed;
          const startTime = globalThis.performance.now();
          const startCpu = process.cpuUsage();

          const result = originalMethod.apply(this, args);

          const endTime = globalThis.performance.now();
          const endMemory = process.memoryUsage().heapUsed;
          const endCpu = process.cpuUsage();

          const duration = endTime - startTime;
          const memoryDelta = endMemory - startMemory;
          const cpuDelta = {
            user: endCpu.user - startCpu.user,
            system: endCpu.system - startCpu.system,
          };
          const cpuUsage =
            ((cpuDelta.user + cpuDelta.system) / 1000 / duration) * 100;

          if (logExit && duration >= minDuration) {
            const message = `← Exiting ${label} (${duration.toFixed(2)}ms)`;
            const logData = {
              className,
              methodName,
              duration: `${duration.toFixed(2)}ms`,
              memoryDelta: `${(memoryDelta / 1024).toFixed(1)}KB`,
              cpuUsage: isNaN(cpuUsage) ? undefined : `${cpuUsage.toFixed(1)}%`,
            };

            switch (logLevel) {
              case "info":
                logger.info(message, undefined, logData);
                break;
              case "warn":
                logger.warn(message, undefined, logData);
                break;
              case "debug":
              default:
                logger.debug(message, logData);
                break;
            }
          }

          return result;
        } catch (error) {
          logger.error(`✗ Error in ${label}`, undefined, error);
          throw error;
        }
      };
    }

    return descriptor;
  };
}
