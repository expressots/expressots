import { provide } from "inversify-binding-decorators";
import { randomUUID } from "node:crypto";
import { IEntity } from "./base.entity";

@provide(User)
class User implements IEntity {
    id: string;
    name!: string;
    email!: string;

    constructor() {
        this.id = randomUUID();
    }
}

export { User };
