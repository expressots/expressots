import { User } from "@entities/User";
import { BaseRepository } from "@repositories/Base.Repository";
import { provide } from "inversify-binding-decorators";
import { IUserRepository } from "./IUser.Repository";

@provide(UserRepository)
export class UserRepository extends BaseRepository<User> implements IUserRepository {

    static USERS: User[] = [];

    async FindByEmail(email: string): Promise<User> {
        const user = UserRepository.USERS.find(user => user.email === email) as User;
        return user;
    }
}

