import {
    IInterceptor,
    ExecutionContext,
    CallHandler,
    Interceptor,
    provide,
} from "@expressots/core";

@Interceptor({ priority: {{priority}} })
@provide({{className}}Interceptor)
export class {{className}}Interceptor implements IInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler) {
        const request = context.getRequest();

        // Pre-processing
        const startTime = Date.now();

        const result = await next.handle();

        // Post-processing
        const duration = Date.now() - startTime;
        console.log(`[{{className}}] ${request.method} ${request.path} - ${duration}ms`);

        return result;
    }
}

