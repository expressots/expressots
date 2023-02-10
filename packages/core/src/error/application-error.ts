import { provide } from "inversify-binding-decorators";

@provide(AppError)
class AppError extends Error {

    public statusCode: number;
    public service: string;

    constructor(statusCode: number, message: string, service?: string) {
        super(message);

        this.statusCode = statusCode;
        this.service = service;
    }
}

export { AppError };
