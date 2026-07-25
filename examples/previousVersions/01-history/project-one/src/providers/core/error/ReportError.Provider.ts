import Log, { LogLevel } from '@providers/core/logger/exception/ExceptionLogger.Provider';
import { AppError } from '@providers/core/error/ApplicationError';
import { provide } from 'inversify-binding-decorators';

@provide(Report)
class Report {

    public static Error(applicationError: AppError, service: string = "api-events"): AppError {
        try {
            throw applicationError;

        } catch (error: any) {
            Log(LogLevel.Error, error, service);
            return error;
        }
    }
}

export { Report };