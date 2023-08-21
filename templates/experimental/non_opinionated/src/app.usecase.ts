import { provide } from "inversify-binding-decorators";

@provide(AppUseCase)
class AppUseCase {
    execute() {
        return "Hello Expresso TS!";
    }
}

export { AppUseCase };
