import {
    IInterceptor,
    ExecutionContext,
    CallHandler,
    Interceptor,
    provide,
} from "@expressots/core";

/**
 * {{className}} Interceptor
 *
 * Priority: {{priority}} (lower = earlier execution)
 *
 * Usage:
 * @UseInterceptors({{className}}Interceptor)
 * @controller("/route")
 * export class MyController { }
 */
@Interceptor({ priority: {{priority}} })
@provide({{className}}Interceptor)
export class {{className}}Interceptor implements IInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler) {
        const request = context.getRequest();

        // Pre-processing logic
        console.log(`[{{className}}] Before handler`, {
            method: request.method,
            path: request.path,
        });

        const startTime = Date.now();

        try {
            // Execute next interceptor or handler
            const result = await next.handle();

            // Post-processing logic
            const duration = Date.now() - startTime;
            console.log(`[{{className}}] After handler`, {
                duration: `${duration}ms`,
            });

            return result;
        } catch (error) {
            console.error(`[{{className}}] Handler error`, error);
            throw error;
        }
    }
}

