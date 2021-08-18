import { User } from "@entities/User";
import { provide } from "inversify-binding-decorators";
import { IUserRepository } from "./IUser.Repository";

@provide(UserRepository)
export class UserRepository implements IUserRepository {

    static USERS: User[] = [];

    async create(user: User): Promise<void> {
        UserRepository.USERS.push(user);
    }

    async delete(id: string): Promise<void> {
        UserRepository.USERS.splice(UserRepository.USERS.findIndex(user => user.id === id), 1);
    }

    async update(user: User): Promise<void> {
        const pIndex: number = UserRepository.USERS.findIndex(u => u.id === user.id);
        if (pIndex > -1) {
            UserRepository.USERS[pIndex] = user;
        };
    }

    async findOne(id: string): Promise<User> {
        const user = UserRepository.USERS.find(user => user.id === id) as User;
        return user;
    }

    async findAll(): Promise<User[]> {
        return UserRepository.USERS;
    }

    async findByEmail(email: string): Promise<User> {
        const user = UserRepository.USERS.find(user => user.email === email) as User;
        return user;
    }
}

