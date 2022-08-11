import { User } from "@entities/User";
import { IBaseRepository } from "@repositories/IBase.Repository";

interface IUserRepository extends IBaseRepository<User> {
    FindByEmail(email: string): Promise<User>;
}

export { IUserRepository };