import { provide } from "inversify-binding-decorators";

@provide(Report)
class Report {
    static stack: string;

    static Error(error: Error | string, statusCode?: number, service?: string) {
        if (error instanceof Error) {
            const appError = {
                statusCode,
                message: error.message,
                service,
                name: error.name,
                stack: error.stack
            };
    
            throw appError;
        }

        Error.captureStackTrace(this, this.Error)

        const callerName = this.stack.split('\n')[1]?.trim()?.split(' ')[1];

        const appError = {
            statusCode,
            message: error,
            service: service ?? callerName,
            name: this.Error.name,
            stack: this.stack
        };

        throw appError;
    }
}

export { Report };
