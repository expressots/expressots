import { provide } from "inversify-binding-decorators";

@provide(AppError)
class AppError extends Error {

    public statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);

        this.statusCode = statusCode;
    }
}

export { AppError };
