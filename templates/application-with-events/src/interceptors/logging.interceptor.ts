import {
    injectable,
    Interceptor,
    IInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from "@expressots/core";

/**
 * LoggingInterceptor — structured request/response logging with timing.
 *
 * Registered globally in `app.ts` via `setupInterceptorsForExpress({ customInterceptors: [LoggingInterceptor] })`.
 * Apply per-route instead via `@UseInterceptors(LoggingInterceptor)` on a controller method.
 *
 * Composition helpers (whenInterceptor, unlessInterceptor, pipeInterceptors,
 * combineInterceptors) live in `@expressots/core` and let you conditionally
 * stack interceptors without writing wrapper classes.
 *
 * See https://expresso-ts.com/docs/features/interceptors for the full reference.
 */
@Interceptor({ priority: 10 })
@injectable()
export class LoggingInterceptor implements IInterceptor {
    private readonly logger = new Logger().withContext("HTTP");

    async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
        const req = context.request;
        const start = process.hrtime.bigint();

        this.logger.info(`-> ${req.method} ${req.originalUrl}`);

        try {
            const result = await next.handle();
            const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
            this.logger.info(`<- ${req.method} ${req.originalUrl} ${ms}ms`);
            return result;
        } catch (err) {
            const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
            this.logger.error(`<- ${req.method} ${req.originalUrl} failed after ${ms}ms`, err as Error);
            throw err;
        }
    }
}
