import { provide } from "@expressots/core";
import { randomUUID } from "node:crypto";

@provide({{className}}Entity)
export class {{className}}Entity {
    id: string;

    constructor() {
        this.id = randomUUID();
    }
}
