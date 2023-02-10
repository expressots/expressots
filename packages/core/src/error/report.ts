import { provide } from "inversify-binding-decorators";
import { AppError } from "./application-error";

@provide(Report)
class Report {

    public static Error(error: AppError) {
    
        throw error;
    }
}

export { Report };

