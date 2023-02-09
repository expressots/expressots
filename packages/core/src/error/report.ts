import { provide } from "inversify-binding-decorators";
import { AppError } from "./application-error";

@provide(Report)
class Report {

    public static Error(statusCode: number, message: string) {
        const error: AppError = new AppError(statusCode, message);

        throw error;
    }
}

export { Report };

