import { provide } from "inversify-binding-decorators";
import { AppError } from "./application-error";

/**
 * Report class is a utility class to manage and throw application-specific errors.
 */
@provide(Report)
class Report {

    /**
     * Error method takes an instance of AppError and throws it.
     * @param error - An instance of AppError containing error details.
     */
    public static Error(error: AppError) {
    
        throw error;
    }
}

export { Report };

