import { provide } from "@expressots/core";

@provide({{className}}UseCase)
export class {{className}}UseCase {
    execute(id: string) {
        return "Use Case";
    }
}
