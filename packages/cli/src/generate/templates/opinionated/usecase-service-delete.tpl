import { provide } from "inversify-binding-decorators";

@provide({{className}}UseCase)
export class {{className}}UseCase {
    execute(id: string) {
        return "Use Case";
    }
}
