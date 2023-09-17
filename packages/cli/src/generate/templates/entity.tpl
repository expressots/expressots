import { provide } from "inversify-binding-decorators";
import { randomUUID } from "node:crypto";

@provide({{className}})
export class {{className}} {
    id: string;

    constructor() {
        this.id = randomUUID();
    }
}
