import {
    CallHandler,
    ExecutionContext,
    IInterceptor,
    Interceptor,
    inject,
    provide,
    Logger,
} from "@expressots/core";

@Interceptor({ priority: 1 })
@provide(LoggingInterceptor)
export class LoggingInterceptor implements IInterceptor {
    readonly priority = 1;

    static lastRequest: { method: string; path: string } | null = null;

    constructor(@inject(Logger) private readonly logger: Logger) {}

    async intercept<T>(context: ExecutionContext, next: CallHandler<T>): Promise<T> {
        const request = context.getRequest();

        LoggingInterceptor.lastRequest = {
            method: request.method,
            path: request.path,
        };

        this.logger.info(
            `→ ${request.method} ${request.path}`,
            "logging-interceptor",
        );

        const result = await next.handle();

        this.logger.info(
            `← ${request.method} ${request.path}`,
            "logging-interceptor",
        );

        return result;
    }
}
