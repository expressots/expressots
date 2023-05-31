import { provide } from "inversify-binding-decorators";
import { randomUUID } from "node:crypto";

@provide({{className}})
class {{className}} {
    public id: string;

    constructor() {
        this.id = randomUUID();
    }
}

export { {{className}} };
