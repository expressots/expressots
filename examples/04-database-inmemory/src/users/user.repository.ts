import { inject, provide } from "@expressots/core";
import { AppDatabaseProvider } from "../providers/database.provider";
import { UserModel } from "./user.model";

@provide(UserRepository)
export class UserRepository {
    constructor(@inject(AppDatabaseProvider) private readonly db: AppDatabaseProvider) {}

    private get users() {
        return this.db.table<UserModel>("users");
    }

    list() {
        return this.users.findMany({ orderBy: { createdAt: "desc" } });
    }

    findById(id: string) {
        return this.users.findUnique({ where: { id } });
    }

    create(input: { email: string; name: string }) {
        return this.users.create({ data: input });
    }
}
