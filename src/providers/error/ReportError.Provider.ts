import Log from '@providers/logger/exception/ExceptionLogger.Provider';
import { ApplicationError } from '@providers/error/ApplicationError';

class Report {

    public static Error(applicationError: ApplicationError, returnObject: boolean = false, service: string = "api-events"): void | ApplicationError {
        try {

            throw applicationError;

        } catch (error: any) {

            if (!returnObject) {
                console.log(`Error message: ${error.Message}`);
                console.log(`Error type: ${error.ErrorType}`);
            } else {
                Log(error, service);
                return error;
            }
        }
    }
}

export { Report };