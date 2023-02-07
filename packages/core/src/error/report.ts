import { provide } from "inversify-binding-decorators";
import { AppError } from "./application-error";
import { LogLevel, log } from "../logger";

@provide(Report)
class Report {

    public static Error(appError: AppError, service: string = "unknown-events"): AppError {
        try {
            throw appError;
        } catch (error: any) {
            log(LogLevel.Error, error, service)
            return error;
        }
    }
}

export { Report };