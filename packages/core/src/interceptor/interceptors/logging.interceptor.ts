import { inject, injectable } from "../../di/inversify";
import { Logger } from "../../provider/logger/logger.provider";
import type {
  IInterceptor,
  ExecutionContext,
  CallHandler,
} from "../interceptor.interface";
import { Interceptor } from "../interceptor-decorators";

/**
 * Built-in logging interceptor with request/response logging.
 *
 * @layer public
 * @audience application-developers
 * @concept logging-interceptor
 * @difficulty beginner
 *
 * @summary Quick Start
 * Use LoggingInterceptor to automatically log requests and responses.
 *
 * @example
 * ```typescript
 * @Get("/users")
 * @UseInterceptors(LoggingInterceptor)
 * getUsers() {}
 * ```
 *
 * @public API
 */
@Interceptor({ priority: 5 })
@injectable()
export class LoggingInterceptor implements IInterceptor {
  readonly priority = 5;

  constructor(@inject(Logger) private logger: Logger) {}

  async intercept<T>(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<T> {
    const request = context.getRequest();
    const method = request.method;
    const path = request.path;
    const timestamp = new Date().toISOString();

    this.logger.debug(
      `[${timestamp}] → ${method} ${path}`,
      "logging-interceptor",
    );

    const startTime = Date.now();

    try {
      const result = await next.handle();
      const duration = Date.now() - startTime;

      this.logger.debug(
        `[${timestamp}] ← ${method} ${path} (${duration}ms)`,
        "logging-interceptor",
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        `[${timestamp}] ✗ ${method} ${path} (${duration}ms) - ${error}`,
        "logging-interceptor",
      );

      throw error;
    }
  }
}
