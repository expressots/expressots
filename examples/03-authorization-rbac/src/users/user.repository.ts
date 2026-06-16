import { provide } from "@expressots/core";
import * as bcrypt from "bcryptjs";

export interface StoredUser {
    id: string;
    email: string;
    passwordHash: string;
    roles: Array<string>;
    permissions: Array<string>;
}

@provide(UserRepository)
export class UserRepository {
    private readonly users = new Map<string, StoredUser>();

    constructor() {
        const admin: StoredUser = {
            id: "admin1",
            email: "admin@expressots.dev",
            passwordHash: bcrypt.hashSync("password123", 10),
            roles: ["admin"],
            permissions: ["documents:read", "profile:read"],
        };

        const viewer: StoredUser = {
            id: "u1",
            email: "viewer@expressots.dev",
            passwordHash: bcrypt.hashSync("password123", 10),
            roles: ["user"],
            permissions: ["profile:read"],
        };

        this.users.set(admin.email, admin);
        this.users.set(viewer.email, viewer);
    }

    findByEmail(email: string): StoredUser | undefined {
        return this.users.get(email);
    }

    findById(id: string): StoredUser | undefined {
        return [...this.users.values()].find((user) => user.id === id);
    }
}
