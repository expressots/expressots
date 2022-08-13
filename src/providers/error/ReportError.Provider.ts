import { ApplicationError } from '@providers/error/ApplicationError';

class Report {

    public static Error(applicationError: ApplicationError, returnObject: boolean = false): void | ApplicationError {
        try {

            throw applicationError;

        } catch (error: any) {

            if (!returnObject) {
                console.log(`Error message: ${error.Message}`);
                console.log(`Error type: ${error.ErrorType}`);
            } else {
                return error;
            }
        }
    }
}

export { Report };