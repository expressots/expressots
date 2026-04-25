import { injectable } from "../../di/inversify.js";
import type {
  IInterceptor,
  ExecutionContext,
  CallHandler,
} from "../interceptor.interface.js";
import { Interceptor } from "../interceptor-decorators.js";
import { AppError } from "../../error/app-error.js";
import { StatusCode } from "../../error/status-code.js";

/**
 * Configuration for timeout interceptor
 */
export interface TimeoutOptions {
  /**
   * Timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Custom error message
   */
  message?: string;
}

/**
 * Built-in timeout interceptor to prevent long-running requests.
 *
 * @layer public
 * @audience application-developers
 * @concept timeout-interceptor
 * @difficulty beginner
 *
 * @summary Quick Start
 * Use TimeoutInterceptor to automatically timeout slow requests.
 *
 * @example
 * ```typescript
 * @Get("/slow-operation")
 * @UseInterceptors(new TimeoutInterceptor({ timeout: 5000 }))
 * slowOperation() {}
 * ```
 *
 * @public API
 */
@Interceptor({ priority: 2 })
@injectable()
export class TimeoutInterceptor implements IInterceptor {
  readonly priority = 2;
  private timeout: number;
  private message: string;

  constructor(options?: TimeoutOptions) {
    this.timeout = options?.timeout ?? 30000;
    this.message = options?.message ?? "Request timed out";
  }

  async intercept<T>(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new AppError(this.message, StatusCode.RequestTimeout));
      }, this.timeout);

      next
        .handle()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
