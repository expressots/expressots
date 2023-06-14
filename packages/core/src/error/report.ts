import { provide } from "inversify-binding-decorators";
import { LogLevel, log } from '../logger';

interface IAppError {
    statusCode: number;
    message: string;
    service?: string;
    name: string;
    stack?: string;
}


/**
 * Report class is a utility class to manage and throw application-specific errors.
 */
@provide(Report)
class Report {
    static stack: string;

    /**
     * Error method takes an instance of AppError and throws it.
     * @param error - An instance of AppError containing error details.
     */
    public static Error(error: Error | string, statusCode?: number, service?: string): void {
        let appError: IAppError = {} as IAppError;
        
        Error.captureStackTrace(this, this.Error);

        const callerName: string = this.stack.split("\n")[1]?.trim()?.split(" ")[1];

        if (error instanceof Error) {
            appError = {
                statusCode: statusCode ?? 500,
                message: error.message,
                service: service ?? callerName,
                name: error.name,
                stack: error.stack
            };
        } else {
            appError = {
                statusCode: statusCode ?? 500,
                message: error,
                service: service ?? callerName,
                name: this.Error.name,
                stack: this.stack
            };
        }

        log(LogLevel.Error, appError, appError.service || "service-undefined");

        throw appError;
    }
}

export { Report, IAppError };

