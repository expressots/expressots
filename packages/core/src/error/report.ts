import { provide } from "inversify-binding-decorators";
import { LogLevel, log } from "../logger";

interface IAppError {
    statusCode: number;
    message: string;
    service?: string
    name: string;
    stack?: string;
}

@provide(Report)
class Report {
    static stack: string;

    static Error(error: Error | string, statusCode?: number, service?: string) {
        let appError = {} as IAppError;

        Error.captureStackTrace(this, this.Error)
    
        const callerName = this.stack.split('\n')[1]?.trim()?.split(' ')[1];

        if (error instanceof Error) {
            appError = {
                statusCode,
                message: error.message,
                service: service ?? callerName,
                name: error.name,
                stack: error.stack
            };
        } else {
            appError = {
                statusCode,
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
