import { provide } from "inversify-binding-decorators";

@provide(AppUseCase)
class AppUseCase {
    execute(): string {
        return "Hello from ExpressoTS App";
    }
}

export { AppUseCase };
