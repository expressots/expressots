import Log, { LogLevel } from '@providers/logger/exception/ExceptionLogger.Provider';
import { ApplicationError } from '@providers/error/ApplicationError';

class Report {

    public static Error(applicationError: ApplicationError, returnObject: boolean = false, service: string = "api-events"): void | ApplicationError {
        try {

            throw applicationError;

        } catch (error: any) {

            Log(LogLevel.Error, error, service);
            return (!returnObject) ? null : error;
        }
    }
}

export { Report };