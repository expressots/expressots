import { IUser, User, UserDocument } from "@entities/User";
import { BaseRepository } from "@repositories/Base.Repository";
import { provide } from "inversify-binding-decorators";

@provide(UserRepository)
export class UserRepository extends BaseRepository<IUser, UserDocument> {
    constructor() {
        super();
        this.model = User;
    }
}

