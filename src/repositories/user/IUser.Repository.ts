import { User } from "@entities/User";

export interface IUserRepository {
    create(user: User): Promise<void>;
    delete(id: string): Promise<void>;
    update(player: User): Promise<void>;
    findOne(id: string): Promise<User>;
    findAll(): Promise<User[]>;
    findByEmail(email: string): Promise<User>;
}