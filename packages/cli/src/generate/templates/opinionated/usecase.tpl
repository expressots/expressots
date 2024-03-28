import { provide } from "inversify-binding-decorators";

@provide({{className}}UseCase)
export class {{className}}UseCase {
    execute() {
        return "UseCase";
    }
}
