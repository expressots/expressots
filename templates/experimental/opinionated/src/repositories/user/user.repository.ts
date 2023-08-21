import { User } from "@entities/user.entity";
import { BaseRepository } from "@repositories/base-repository";
import { provide } from "inversify-binding-decorators";

@provide(UserRepository)
class UserRepository extends BaseRepository<User> {
    constructor() {
        super();
    }

    findByEmail(email: string): User | null {
        const user = this.USERDB.find((item) => item.email === email);
        return user || null;
    }
}

export { UserRepository };
