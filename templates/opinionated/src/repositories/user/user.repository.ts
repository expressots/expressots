import { User } from "@entities/user.entity";
import { BaseRepository } from "@repositories/base-repository";
import { provide } from "inversify-binding-decorators";

@provide(UserRepository)
class UserRepository extends BaseRepository<User> {
    constructor() {
        super("users");
    }

    findByEmail(email: string): User | null {
        const user = this.table.find((item) => item.email === email);
        return user || null;
    }
}

export { UserRepository };
