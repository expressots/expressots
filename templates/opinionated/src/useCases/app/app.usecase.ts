import { provide } from "@expressots/core";

@provide(AppUseCase)
export class AppUseCase {
    execute() {
        return "Hello from ExpressoTS!";
    }
}
