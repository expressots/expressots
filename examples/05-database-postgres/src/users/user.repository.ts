import { inject, provide } from "@expressots/core";
import { PostgresProvider } from "../providers/postgres.provider";

export interface UserRow {
    id: string;
    email: string;
    name: string;
    created_at: Date;
}

@provide(UserRepository)
export class UserRepository {
    constructor(@inject(PostgresProvider) private readonly db: PostgresProvider) {}

    list() {
        return this.db.query<UserRow>(
            "SELECT id, email, name, created_at FROM users ORDER BY created_at DESC",
        );
    }

    async create(input: { email: string; name: string }) {
        const rows = await this.db.query<UserRow>(
            "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name, created_at",
            [input.email, input.name],
        );
        return rows[0];
    }
}
