import { provide } from "inversify-binding-decorators";

/**
 * The AppError class extends the built-in Error class, adding a status code and service property.
 * It is designed for handling application-specific errors with more detailed information.
 * @provide AppError
 */
@provide(AppError)
class AppError extends Error {

    public statusCode: number;
    public service: string;

    /**
     * Constructs a new AppError instance.
     * @param statusCode - The status code associated with the error.
     * @param message - The error message.
     * @param service - An optional service name related to the error.
     */
    constructor(statusCode: number, message: string, service?: string) {
        super(message);

        this.statusCode = statusCode;
        this.service = service;
    }
}

export { AppError };
