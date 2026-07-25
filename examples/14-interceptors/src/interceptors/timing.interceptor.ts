import {
    CallHandler,
    ExecutionContext,
    IInterceptor,
    Interceptor,
    provide,
} from "@expressots/core";

@Interceptor({ priority: 50 })
@provide(TimingInterceptor)
export class TimingInterceptor implements IInterceptor {
    readonly priority = 50;

    static lastTimingMs: number | null = null;

    async intercept<T>(context: ExecutionContext, next: CallHandler<T>): Promise<T> {
        const start = Date.now();
        const result = await next.handle();
        const timingMs = Date.now() - start;

        TimingInterceptor.lastTimingMs = timingMs;
        context.setData("timingMs", timingMs);

        return result;
    }
}
