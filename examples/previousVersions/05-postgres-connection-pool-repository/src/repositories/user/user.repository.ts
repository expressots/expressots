import { User } from "@entities/user.entity";
import { BaseRepository } from "@repositories/base-repository";
import { provide } from "inversify-binding-decorators";

@provide(UserRepository)
export class UserRepository extends BaseRepository<User> {
    constructor() {
        super();
        this.tableName = "users";
    }

    async findByEmail(email: string): Promise<User | null> {
        const client = await this.db.connect();

        try {
            const res = await client.query(
                `SELECT * FROM users WHERE email = $1`,
                [email],
            );

            return res.rows[0] as User;
        } finally {
            client.release();
        }
    }
}
