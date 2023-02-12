import { AppError, Report, StatusCode } from "@expressots/core";
import { provide } from "inversify-binding-decorators";

@provide(PingUseCase)
class PingUseCase {

    execute() {
        return "Hello World!";
    }
}

export { PingUseCase };