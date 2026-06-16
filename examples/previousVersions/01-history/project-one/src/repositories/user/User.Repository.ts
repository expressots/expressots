import { IUser, User, UserDocument } from "@entities/User";
import { MongooseProvider } from "@providers/database/mongodb/orm/mongoose/Mongoose.Provider";
import { BaseRepository } from "@repositories/Base.Repository";
import { provide } from "inversify-binding-decorators";
import mongoose from "mongoose";

@provide(UserRepository)
export class UserRepository extends BaseRepository<IUser, UserDocument> {

    constructor() {
        super();
        this.model = User;
    }
}

