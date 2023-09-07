import { provide } from "inversify-binding-decorators";

@provide(AppUseCase)
class AppUseCase {
    async execute() {
        return "Hello Expresso TS!";
    }
}

export { AppUseCase };
