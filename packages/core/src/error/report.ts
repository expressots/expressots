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
 * Report class is a utility class to manage and log errors within the application.
 * It is responsible for creating a standardized error object, logging it,
 * and then throwing the error for further handling.
 */
@provide(Report)
class Report {
    static stack: string;

    /**
     * The Error method is responsible for generating a standardized error object,
     * logging the error, and then throwing it for further handling.
     * The error thrown is of the custom type IAppError, which extends the built-in Error class.
     *
     * @param error - An instance of Error or a string that describes the error.
     * @param statusCode - The HTTP status code associated with the error (default is 500).
     * @param service - The service name associated with the error. If not specified,
     *                  it defaults to the name of the calling function.
     *
     * @throws An object of the custom type IAppError, which includes details about the error.
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

