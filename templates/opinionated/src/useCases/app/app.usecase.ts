import { provide } from "inversify-binding-decorators";

@provide(AppUseCase)
class AppUseCase {
    execute() {
        return "Hello from ExpressoTS App";
    }
}

export { AppUseCase };
