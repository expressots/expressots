import { provide } from "inversify-binding-decorators";

@provide({{className}}{{schematic}})
export class {{className}}{{schematic}} {
    execute() {
        return "{{schematic}}";
    }
}
