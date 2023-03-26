import { provide } from "inversify-binding-decorators";
import { randomUUID } from "node:crypto";

@provide(User)
class User {
    private id: string;
    public name: string;
    public email: string;

    constructor(name: string, email: string) {
        this.id = randomUUID();
        this.name = name;
        this.email = email;
    }

    get Id(): string {
        return this.id;
    }
}

export { User };
